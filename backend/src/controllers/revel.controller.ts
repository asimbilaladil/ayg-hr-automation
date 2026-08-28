import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { syncAygFoodsEmployees } from '../revel/revel.sync.service';
import { createNotification } from '../services/notifications.service';
import { extractRatingWithAI } from '../services/rating-ai.service';

// How many recent call-log rows to embed per employee in list responses.
const CALL_LOG_TAKE = 15;
const callLogInclude = { orderBy: { attemptedAt: 'desc' as const }, take: CALL_LOG_TAKE };

// Map a raw VAPI ended-reason / status string to a canonical call outcome.
export function normalizeOutcome(raw?: string | null): string | null {
  const s = (raw ?? '').toString().toLowerCase();
  if (!s) return null;
  if (/voicemail|machine|beep/.test(s)) return 'VOICEMAIL';
  if (/no-?\s?answer|silence|timed?-?\s?out|did-?not-?answer|didn'?t-?answer|unanswered|not-?answered|no-?input|customer-did-not/.test(s)) return 'NO_ANSWER';
  if (/complete|answered|success|customer-ended|assistant-ended/.test(s)) return 'COMPLETED';
  return 'FAILED';
}

// Append one row to the call-attempt history for an employee. Never throws into
// the request path — a logging failure must not fail the call the workflow made.
async function logCallAttempt(
  employeeId: string,
  entry: {
    outcome?: string | null;
    endedReason?: string | null;
    vapiCallId?: string | null;
    durationSec?: number | null;
    recordingUrl?: string | null;
    notes?: string | null;
    attemptedAt?: Date;
  },
): Promise<void> {
  try {
    await prisma.revelCallLog.create({
      data: {
        employeeId,
        attemptedAt: entry.attemptedAt ?? new Date(),
        outcome: entry.outcome ?? null,
        endedReason: entry.endedReason ?? null,
        vapiCallId: entry.vapiCallId ?? null,
        durationSec: entry.durationSec ?? null,
        recordingUrl: entry.recordingUrl ?? null,
        notes: entry.notes ?? null,
      },
    });
  } catch (err) {
    console.error(`[Revel] failed to write call log for employee ${employeeId}:`, err);
  }
}

export async function triggerSync(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await syncAygFoodsEmployees();
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
}

export async function markCalled(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { called } = req.body as { called: boolean };

    const employee = await prisma.aygFoodsEmployee.update({
      where: { id },
      data: {
        called,
        calledAt: called ? new Date() : null,
      },
      include: {
        location: { select: { name: true } },
        manager:  { select: { name: true } },
      },
    });

    if (called) {
      await logCallAttempt(id, { outcome: 'MANUAL', notes: 'Marked as called from the Onboarding page' });
    } else {
      // undo: drop the manual "done" markers so the employee is outstanding again
      await prisma.revelCallLog.deleteMany({ where: { employeeId: id, outcome: 'MANUAL' } });
    }

    res.json(employee);
  } catch (err) {
    next(err);
  }
}

const VOICEMAIL_RE = /voicemail|machine|beep/i;

/**
 * Parses a client-supplied date. Falsy → null. An unparseable string raises a
 * 400 instead of letting `new Date("bad")` reach Prisma as an Invalid Date
 * (which surfaces as an opaque 500).
 */
function parseClientDate(value: unknown, field: string): Date | null {
  if (value === null || value === undefined || value === '') return null;
  // n8n leaks a leading "=" from expression-mode fields; tolerate it.
  const raw = typeof value === 'string' ? value.replace(/^=/, '').trim() : value;
  if (raw === '') return null;
  const d = new Date(raw as string);
  if (Number.isNaN(d.getTime())) {
    const e: any = new Error(`Invalid date for "${field}": ${JSON.stringify(value)}`);
    e.status = 400;
    throw e;
  }
  return d;
}

export async function updateEmployee(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { called, calledAt, nextCallAt, lastCallAt, endedReason, status, vapiCallId, durationSec, recordingUrl, notes } = req.body as {
      called?: boolean;
      calledAt?: string | null;
      nextCallAt?: string | null;
      lastCallAt?: string | null;
      endedReason?: string;
      status?: string;
      vapiCallId?: string;
      durationSec?: number;
      recordingUrl?: string;
      notes?: string;
    };

    const isVoicemail = VOICEMAIL_RE.test(endedReason ?? '') || /voicemail/i.test(status ?? '');

    // Cooldown: honour an explicit nextCallAt (or explicit null to clear it);
    // otherwise auto-set a 1-hour cooldown when the call hit voicemail.
    let cooldown: Date | null | undefined;
    if (nextCallAt !== undefined) {
      cooldown = parseClientDate(nextCallAt, 'nextCallAt');
    } else if (isVoicemail) {
      cooldown = new Date(Date.now() + 60 * 60 * 1000);
    }

    // Did this request describe a call attempt? (used to stamp lastCallAt)
    const isCallAttempt =
      calledAt !== undefined || lastCallAt !== undefined ||
      endedReason !== undefined || status !== undefined || isVoicemail;

    const data = {
      ...(called !== undefined && { called }),
      ...(calledAt !== undefined
        ? { calledAt: parseClientDate(calledAt, 'calledAt') }
        : {
            ...(called === true  && { calledAt: new Date() }),
            ...(called === false && { calledAt: null }),
          }),
      ...(cooldown !== undefined && { nextCallAt: cooldown }),
      ...(endedReason !== undefined && { endedReason }),
      ...(lastCallAt !== undefined
        ? { lastCallAt: parseClientDate(lastCallAt, 'lastCallAt') }
        : (isCallAttempt ? { lastCallAt: new Date() } : {})),
    };

    const employee = await prisma.aygFoodsEmployee.update({
      where: { id },
      data,
      include: {
        location: {
          select: {
            id: true, name: true, address: true,
            manager: { select: { id: true, name: true, email: true } },
          },
        },
        review: true,
      },
    });

    // Record the attempt in the call history whenever this PATCH carried an
    // actual call outcome (an ended-reason/status, or a cooldown being set).
    // A bare {called:true}/{calledAt} from the workflow's "call started" step
    // is not logged here — only results are.
    const hasOutcomeSignal =
      endedReason !== undefined || status !== undefined || isVoicemail ||
      (nextCallAt !== undefined && !!nextCallAt);
    if (hasOutcomeSignal) {
      await logCallAttempt(id, {
        outcome: normalizeOutcome(endedReason ?? status) ?? (cooldown ? 'VOICEMAIL' : 'ATTEMPTED'),
        endedReason: endedReason ?? null,
        vapiCallId: vapiCallId ?? null,
        durationSec: durationSec ?? null,
        recordingUrl: recordingUrl ?? null,
        notes: notes ?? null,
        attemptedAt: parseClientDate(calledAt, 'calledAt') ?? new Date(),
      });
    }

    const withLogs = await prisma.aygFoodsEmployee.findUnique({
      where: { id },
      include: { callLogs: callLogInclude },
    });

    const merged = { ...employee, callLogs: withLogs?.callLogs ?? [] };
    res.json({
      ...merged,
      callStatus: deriveCallOutcome(merged),
      daysSinceStart: daysSinceStart(employee.employeeStart),
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/revel/employees/:id/call-log
// Explicit, richer call-attempt logging for the n8n / VAPI workflow. Creates a
// history row AND updates the employee's rollup fields (lastCallAt, endedReason,
// and a voicemail cooldown) so the workflow can use just this one endpoint.
export async function postCallLog(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { outcome, endedReason, status, vapiCallId, durationSec, recordingUrl, notes, attemptedAt, nextCallAt } =
      req.body as {
        outcome?: string;
        endedReason?: string;
        status?: string;
        vapiCallId?: string;
        durationSec?: number;
        recordingUrl?: string;
        notes?: string;
        attemptedAt?: string;
        nextCallAt?: string | null;
      };

    const employee = await prisma.aygFoodsEmployee.findUnique({ where: { id } });
    if (!employee) {
      res.status(404).json({ error: 'Employee not found' });
      return;
    }

    const resolvedOutcome = (outcome && outcome.toUpperCase()) || normalizeOutcome(endedReason ?? status) || 'ATTEMPTED';
    const at = parseClientDate(attemptedAt, 'attemptedAt') ?? new Date();
    const isVoicemail = resolvedOutcome === 'VOICEMAIL';

    // cooldown: explicit nextCallAt wins; else 1h on voicemail
    let cooldown: Date | null | undefined;
    if (nextCallAt !== undefined) cooldown = parseClientDate(nextCallAt, 'nextCallAt');
    else if (isVoicemail) cooldown = new Date(Date.now() + 60 * 60 * 1000);

    await logCallAttempt(id, {
      outcome: resolvedOutcome,
      endedReason: endedReason ?? null,
      vapiCallId: vapiCallId ?? null,
      durationSec: durationSec ?? null,
      recordingUrl: recordingUrl ?? null,
      notes: notes ?? null,
      attemptedAt: at,
    });

    const updated = await prisma.aygFoodsEmployee.update({
      where: { id },
      data: {
        lastCallAt: at,
        ...(endedReason !== undefined && { endedReason }),
        ...(cooldown !== undefined && { nextCallAt: cooldown }),
      },
      include: {
        location: {
          select: {
            id: true, name: true, address: true,
            manager: { select: { id: true, name: true, email: true } },
          },
        },
        review: true,
        callLogs: callLogInclude,
      },
    });

    res.status(201).json({
      ...updated,
      callStatus: deriveCallOutcome(updated),
      daysSinceStart: daysSinceStart(updated.employeeStart),
    });
  } catch (err) {
    next(err);
  }
}

// Maps VAPI answer category → DB fields
const CATEGORY_MAP: Record<string, { notes: string; rating?: string }> = {
  'Orientation & Tools':  { notes: 'q1Notes', rating: 'q1Rating' },
  'Training & Support':   { notes: 'q2Notes', rating: 'q2Rating' },
  'Job Surprises':        { notes: 'q3Notes', rating: 'q3Rating' },
  'Team & Culture':       { notes: 'q4Notes', rating: 'q4Rating' },
  'Training Schedule':    { notes: 'q5Notes', rating: 'q5Rating' },
  'Clarity Needed':       { notes: 'q6Notes', rating: 'q6Rating' },
  'Support Needed':       { notes: 'q7Notes', rating: 'q7Rating' },
};

type Turn = { role: 'AI' | 'User'; text: string };

function parseTranscriptTurns(transcript: string): Turn[] {
  return transcript.split('\n')
    .map(l => l.trim())
    .filter(l => l.startsWith('AI:') || l.startsWith('User:'))
    .map(l => l.startsWith('AI:')
      ? { role: 'AI' as const, text: l.slice(3).trim() }
      : { role: 'User' as const, text: l.slice(5).trim() });
}

// Given the transcript turns and a question string, extract only the user
// utterances that directly follow the AI turn asking that question.
// `searchFrom` bounds the scan to turns at/after the previous question's match,
// since consecutive questions are asked in order — without it, an AI turn that
// transitions into the NEXT question (and echoes back keywords from this one,
// e.g. "...your training schedule... Now, do you feel you've received adequate
// training and support?") could otherwise be picked up as a match for THIS one.
function extractAnswerFromTranscript(
  turns: Turn[],
  question: string,
  searchFrom = 0,
): { text: string | null; matchedIdx: number } {
  const keywords = question.toLowerCase().split(/\s+/).filter(w => w.length > 4).slice(0, 6);
  const threshold = Math.min(3, Math.ceil(keywords.length * 0.5));

  let bestIdx = -1;
  let bestHits = 0;
  for (let i = searchFrom; i < turns.length; i++) {
    if (turns[i].role !== 'AI') continue;
    const hit = keywords.filter(kw => turns[i].text.toLowerCase().includes(kw)).length;
    // prefer the turn with the most keyword hits; ties go to the later turn
    // (handles the AI rephrasing the same question again mid-conversation)
    if (hit >= threshold && hit >= bestHits) {
      bestHits = hit;
      bestIdx = i;
    }
  }
  if (bestIdx === -1) return { text: null, matchedIdx: searchFrom };

  const userTexts: string[] = [];
  for (let i = bestIdx + 1; i < turns.length; i++) {
    if (turns[i].role === 'User') {
      userTexts.push(turns[i].text);
    } else if (userTexts.length > 0) {
      break; // stop at next AI turn once we have user speech
    }
    // if no user speech yet and we hit another AI turn, keep scanning
  }
  return { text: userTexts.length ? userTexts.join(' ') : null, matchedIdx: bestIdx };
}

// VAPI's recordingUrl is stored as "{callId}-{epochMillis}-{randomId}-mono.wav" —
// used to recover the call id for recordings saved before vapiCallId was captured
// explicitly.
function extractCallIdFromUrl(url?: string | null): string | undefined {
  if (!url) return undefined;
  const match = url.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})-\d+-/i);
  return match?.[1];
}

async function mapAnswers(answers: Array<{ category: string; question?: string; answer: string; rating?: number }>) {
  const mapped: Record<string, any> = {};
  await Promise.all(answers.map(async a => {
    const mapping = CATEGORY_MAP[a.category];
    if (!mapping) return;
    if (a.answer) mapped[mapping.notes] = a.answer;
    if (mapping.rating) {
      const rating = a.rating != null
        ? Number(a.rating)
        : await extractRatingWithAI(a.question ?? a.category, a.answer);
      if (rating) mapped[mapping.rating] = rating;
    }
  }));
  return mapped;
}

export async function upsertReview(req: Request, res: Response, next: NextFunction) {
  try {
    const id = req.params.id.replace(/^=+/, '');
    const {
      reviewType,
      q1Rating, q1Notes,
      q2Rating, q2Notes,
      q3Rating, q3Notes,
      q4Rating, q4Notes,
      q5Rating, q5Notes,
      q6Rating, q6Notes,
      q7Rating, q7Notes,
      overallNotes, reviewedAt,
      transcript, recordingUrl, vapiCallId, callStatus, answers,
    } = req.body;

    const answersStr = answers !== undefined
      ? (typeof answers === 'string' ? answers : JSON.stringify(answers))
      : undefined;

    // Parse answers if it arrived as a JSON string
    const rawAnswersArr: Array<{ category: string; question?: string; answer: string; rating?: number }> =
      Array.isArray(answers)
        ? answers
        : (typeof answers === 'string' ? (() => { try { return JSON.parse(answers); } catch { return []; } })() : []);

    // Clean each answer using the transcript so only the relevant user utterances
    // are stored (VAPI tends to bundle all prior speech into each answer).
    const turns = transcript ? parseTranscriptTurns(transcript) : [];
    let searchCursor = 0;
    const answersArr = rawAnswersArr.map(a => {
      if (!turns.length || !a.question) return a;
      const { text: clean, matchedIdx } = extractAnswerFromTranscript(turns, a.question, searchCursor);
      if (clean) searchCursor = matchedIdx + 1;
      return clean ? { ...a, answer: clean } : a;
    });

    const cleanedAnswersStr = answersArr.length ? JSON.stringify(answersArr) : answersStr;
    const fromAnswers = answersArr.length ? await mapAnswers(answersArr) : {};

    const data = {
      reviewType,
      // explicit fields take precedence; fallback to auto-mapped
      q1Rating: q1Rating ?? fromAnswers.q1Rating,
      q1Notes:  q1Notes  ?? fromAnswers.q1Notes,
      q2Rating: q2Rating ?? fromAnswers.q2Rating,
      q2Notes:  q2Notes  ?? fromAnswers.q2Notes,
      q3Rating: q3Rating ?? fromAnswers.q3Rating,
      q3Notes:  q3Notes  ?? fromAnswers.q3Notes,
      q4Rating: q4Rating ?? fromAnswers.q4Rating,
      q4Notes:  q4Notes  ?? fromAnswers.q4Notes,
      q5Rating: q5Rating ?? fromAnswers.q5Rating,
      q5Notes:  q5Notes  ?? fromAnswers.q5Notes,
      q6Rating: q6Rating ?? fromAnswers.q6Rating,
      q6Notes:  q6Notes  ?? fromAnswers.q6Notes,
      q7Rating: q7Rating ?? fromAnswers.q7Rating,
      q7Notes:  q7Notes  ?? fromAnswers.q7Notes,
      overallNotes,
      transcript, recordingUrl, callStatus,
      vapiCallId: vapiCallId ?? extractCallIdFromUrl(recordingUrl),
      answers: cleanedAnswersStr,
      reviewedAt: reviewedAt ? new Date(reviewedAt) : new Date(),
    };

    const review = await prisma.onboardingReview.upsert({
      where: { employeeId: id },
      create: { employeeId: id, ...data },
      update: data,
    });

    // also mark employee as called, and clear any voicemail cooldown
    const employee = await prisma.aygFoodsEmployee.update({
      where: { id },
      data: { called: true, calledAt: review.reviewedAt, nextCallAt: null },
      include: { manager: true },
    });

    // record the successful call in the attempt history
    await logCallAttempt(id, {
      outcome: 'COMPLETED',
      endedReason: callStatus ?? null,
      vapiCallId: review.vapiCallId ?? null,
      recordingUrl: review.recordingUrl ?? null,
      attemptedAt: review.reviewedAt,
    });

    // notify the manager, all HR users, and all admins
    const employeeName = `${employee.firstName} ${employee.lastName}`;
    const notifTitle = 'Onboarding Review Recorded';
    const notifBody  = `A review has been recorded for employee ${employeeName}${employee.establishmentName ? ` (${employee.establishmentName})` : ''}.`;
    const metadata   = { employeeId: id, reviewType: review.reviewType };

    const recipientIds = new Set<string>();

    if (employee.managerId) recipientIds.add(employee.managerId);

    const staffUsers = await prisma.user.findMany({
      where: { role: { in: ['HR', 'ADMIN'] } },
      select: { id: true },
    });
    staffUsers.forEach(u => recipientIds.add(u.id));

    await Promise.all(
      [...recipientIds].map(uid => createNotification(uid, notifTitle, notifBody, metadata)),
    );

    res.json(review);
  } catch (err) {
    next(err);
  }
}

export async function getReview(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const review = await prisma.onboardingReview.findUnique({ where: { employeeId: id } });
    res.json(review ?? null);
  } catch (err) {
    next(err);
  }
}

// Since July 2026, VAPI's recordingUrl points at private storage and can no longer
// be fetched directly — it now requires calling VAPI's own API with a private key,
// which 302-redirects to a short-lived signed URL. This proxies that exchange so the
// VAPI key never reaches the browser, and streams the audio back to the client.
export async function getRecording(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const review = await prisma.onboardingReview.findUnique({ where: { employeeId: id } });
    const callId = review?.vapiCallId ?? extractCallIdFromUrl(review?.recordingUrl);
    if (!review?.recordingUrl || !callId) {
      res.status(404).json({ error: 'No recording found' });
      return;
    }

    const apiKey = process.env.VAPI_PRIVATE_API_KEY;
    if (!apiKey) {
      res.status(500).json({ error: 'VAPI_PRIVATE_API_KEY is not configured' });
      return;
    }

    const vapiRes = await fetch(`https://api.vapi.ai/call/${callId}/mono-recording`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!vapiRes.ok || !vapiRes.body) {
      // Surface VAPI's own reason (e.g. "This call exceeds your retention window")
      // instead of a generic error — the recording may simply no longer exist on
      // their end (their retention policy applies regardless of our own data).
      const detail = await vapiRes.text().catch(() => '');
      let message = 'Failed to fetch recording from VAPI';
      try { message = JSON.parse(detail).message || message; } catch { /* not JSON */ }
      res.status(vapiRes.status === 404 ? 404 : 502).json({ error: message });
      return;
    }

    res.setHeader('Content-Type', vapiRes.headers.get('content-type') || 'audio/wav');
    const len = vapiRes.headers.get('content-length');
    if (len) res.setHeader('Content-Length', len);
    // Stream rather than buffer — long calls are 25-30 MB and buffering the
    // whole file added seconds of latency before the client saw any bytes.
    const { Readable } = require('stream');
    Readable.fromWeb(vapiRes.body as any).pipe(res);
  } catch (err) {
    next(err);
  }
}

// Default location/establishment new test records are created under —
// matches the existing Ray Murray / Asim Bilal test records.
const TEST_RECORD_DEFAULTS = {
  locationId: 'cmo3k2a7h0010dnrle21s46wy',
  managerId: 'cmo3k2a7m0011dnrl9tl7zfcp',
  establishmentId: 32,
  establishmentName: 'LCF Airtex',
};

export async function createTestRecord(req: Request, res: Response, next: NextFunction) {
  try {
    const { firstName, lastName, phone } = req.body as { firstName?: string; lastName?: string; phone?: string };

    if (!firstName?.trim() || !lastName?.trim() || !phone?.trim()) {
      res.status(400).json({ error: 'firstName, lastName, and phone are required' });
      return;
    }

    const employeeStart = new Date();
    employeeStart.setDate(employeeStart.getDate() - 31);

    let employee;
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        employee = await prisma.aygFoodsEmployee.create({
          data: {
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            phone: phone.trim(),
            revelId: -Math.floor(Math.random() * 1_000_000_000 + 1), // negative = never collides with real Revel IDs
            employeeStart,
            isActive: true,
            isTest: true,
            called: false,
            ...TEST_RECORD_DEFAULTS,
          },
          include: {
            location: {
              select: {
                id: true, name: true, address: true,
                manager: { select: { id: true, name: true, email: true } },
              },
            },
            review: true,
          },
        });
        break;
      } catch (err: any) {
        if (err?.code === 'P2002' && attempt < 4) continue; // revelId collision, retry
        throw err;
      }
    }

    res.status(201).json(employee);
  } catch (err) {
    next(err);
  }
}

export async function resetTestRecord(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;

    const existing = await prisma.aygFoodsEmployee.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: 'Employee not found' });
      return;
    }
    if (!existing.isTest) {
      res.status(403).json({ error: 'Only test records can be reset' });
      return;
    }

    await prisma.onboardingReview.deleteMany({ where: { employeeId: id } });

    const employee = await prisma.aygFoodsEmployee.update({
      where: { id },
      data: { called: false, calledAt: null },
      include: {
        location: {
          select: {
            id: true, name: true, address: true,
            manager: { select: { id: true, name: true, email: true } },
          },
        },
        review: true,
      },
    });

    res.json(employee);
  } catch (err) {
    next(err);
  }
}

// Derived call outcome for a synced employee. There is no dedicated column —
// it is computed from the linked OnboardingReview (and the `called` flag) so the
// n8n / VAPI workflow doesn't have to send a normalised status.
export type CallOutcome = 'NOT_CALLED' | 'SUCCESS' | 'NO_ANSWER' | 'VOICEMAIL' | 'FAILED';

// How many of the employee's questions were actually answered on the call.
// A real 30-day review fills all 7; a call that only reached a receptionist or
// dropped early yields 0–1. We count an answer only when it has real substance
// (>= 3 words) so a stray "Thanks." from a gatekeeper doesn't count.
export function countReviewAnswers(review: any): number {
  if (!review) return 0;
  const substantial = (s: unknown) =>
    typeof s === 'string' && s.trim().split(/\s+/).filter(Boolean).length >= 3;

  let n = [review.q1Notes, review.q2Notes, review.q3Notes, review.q4Notes,
           review.q5Notes, review.q6Notes, review.q7Notes].filter(substantial).length;

  if (typeof review.answers === 'string' && review.answers.trim()) {
    try {
      const arr = JSON.parse(review.answers);
      if (Array.isArray(arr)) {
        n = Math.max(n, arr.filter(a => substantial(a?.answer)).length);
      }
    } catch { /* not JSON — ignore */ }
  }
  return n;
}

// A call only counts as SUCCESS when the employee genuinely went through the
// review (>= 2 substantive answers). Everything short of that is retryable.
const REVIEW_SUCCESS_MIN_ANSWERS = 2;

export function deriveCallOutcome(
  employee: {
    called?: boolean; review?: any; endedReason?: string | null;
    nextCallAt?: Date | string | null; lastCallAt?: Date | string | null;
    callLogs?: Array<{ outcome?: string | null }>;
  },
): CallOutcome {
  const review = employee.review;

  if (countReviewAnswers(review) >= REVIEW_SUCCESS_MIN_ANSWERS) return 'SUCCESS';

  // a human ticking "Mark Called" on the Onboarding page counts as done
  if ((employee.callLogs ?? []).some(l => l.outcome === 'MANUAL')) return 'SUCCESS';

  // employee.endedReason (set by the n8n workflow) takes precedence over the
  // review's raw callStatus string.
  const raw = (employee.endedReason ?? review?.callStatus ?? '').toString().toLowerCase();
  if (raw) {
    if (/voicemail|machine|beep/.test(raw)) return 'VOICEMAIL';
    if (/no-?\s?answer|silence|timed?-?\s?out|did-?not-?answer|didn'?t-?answer|unanswered|not-?answered|no-?input|customer-did-not/.test(raw)) return 'NO_ANSWER';
  }

  // a cooldown timestamp is only ever set after a call hit voicemail
  if (employee.nextCallAt) return 'VOICEMAIL';

  // a review row with no real answers = we reached the line but never got the
  // review (receptionist, wrong person, early hang-up) — needs another try
  if (review) return 'NO_ANSWER';

  // `called` is set by the workflow when it *starts* dialling, so on its own it
  // means "attempted", not "done" — treat as still-to-do
  if (employee.called || employee.lastCallAt) return 'NO_ANSWER';

  return 'NOT_CALLED';
}

// Whole days elapsed since the employee's start date (null when unknown).
export function daysSinceStart(employeeStart?: Date | string | null): number | null {
  if (!employeeStart) return null;
  const start = new Date(employeeStart);
  if (Number.isNaN(start.getTime())) return null;
  return Math.floor((Date.now() - start.getTime()) / 86_400_000);
}

export async function listEmployees(req: Request, res: Response, next: NextFunction) {
  try {
    const { establishmentId, isActive, phone, called, callStatus, hiredDaysAgo, limit, nextCallAtBefore, includeCooldown, needsCall } = req.query;

    // ?hiredDaysAgo=30 → only employees whose start date is at least 30 days ago
    let hiredBefore: Date | undefined;
    if (hiredDaysAgo !== undefined && !Number.isNaN(Number(hiredDaysAgo))) {
      hiredBefore = new Date();
      hiredBefore.setDate(hiredBefore.getDate() - Number(hiredDaysAgo));
    }

    const take = limit !== undefined && Number.isInteger(Number(limit)) && Number(limit) > 0
      ? Number(limit)
      : undefined;

    // Voicemail cooldown handling:
    //  - an explicit ?nextCallAtBefore=<ISO> filters to that cutoff for anyone;
    //  - otherwise n8n (API-key auth) automatically only sees employees callable
    //    *now* — those still in cooldown are hidden without any query param, so
    //    the workflow never re-dials them. Pass ?includeCooldown=true to opt out.
    //  - JWT/UI callers are unaffected: they see everyone (the Onboarding page
    //    still shows employees sitting in a voicemail cooldown).
    let cooldownCutoff: Date | undefined;
    if (nextCallAtBefore !== undefined && !Number.isNaN(Date.parse(String(nextCallAtBefore)))) {
      cooldownCutoff = new Date(String(nextCallAtBefore));
    } else if (req.isN8N && includeCooldown !== 'true') {
      cooldownCutoff = new Date();
    }

    const employees = await prisma.aygFoodsEmployee.findMany({
      where: {
        ...(establishmentId ? { establishmentId: Number(establishmentId) } : {}),
        ...(isActive !== undefined ? { isActive: isActive === 'true' } : {}),
        ...(phone ? { phone: { contains: String(phone) } } : {}),
        ...(called !== undefined ? { called: called === 'true' } : {}),
        ...(hiredBefore ? { employeeStart: { lte: hiredBefore } } : {}),
        ...(cooldownCutoff
          ? { OR: [{ nextCallAt: null }, { nextCallAt: { lte: cooldownCutoff } }] }
          : {}),
      },
      // when filtering by a derived value (callStatus / needsCall) we must
      // post-filter in memory, so the DB-level take only applies without those
      ...(take !== undefined && callStatus === undefined && needsCall !== 'true' ? { take } : {}),
      include: {
        location: {
          select: {
            id: true, name: true, address: true,
            manager: { select: { id: true, name: true, email: true } },
          },
        },
        review: true,
        callLogs: callLogInclude,
      },
      orderBy: [{ establishmentId: 'asc' }, { lastName: 'asc' }],
    });

    let withOutcome = employees.map(e => ({
      ...e,
      callStatus: deriveCallOutcome(e),
      daysSinceStart: daysSinceStart(e.employeeStart),
    }));

    // ?callStatus=SUCCESS|NO_ANSWER|VOICEMAIL|FAILED|NOT_CALLED (comma-separated ok)
    if (callStatus !== undefined) {
      const wanted = String(callStatus).toUpperCase().split(',').map(s => s.trim()).filter(Boolean);
      withOutcome = withOutcome.filter(e => wanted.includes(e.callStatus));
    }

    // ?needsCall=true → everyone not yet successfully reviewed (the simplest
    // "who should the workflow call" query — survives new outcome values).
    const postFiltered = callStatus !== undefined || needsCall === 'true';
    if (needsCall === 'true') {
      withOutcome = withOutcome.filter(e => e.callStatus !== 'SUCCESS');
    }

    // apply limit in memory when it couldn't be pushed to the DB query
    if (take !== undefined && postFiltered) {
      withOutcome = withOutcome.slice(0, take);
    }

    res.json({ total: withOutcome.length, employees: withOutcome });
  } catch (err) {
    next(err);
  }
}

export async function getCandidateByPhone(req: Request, res: Response, next: NextFunction) {
  try {
    const raw = req.params.phone.replace(/^=+/, '');
    const normalize = (p: string) => p.replace(/[\s\-().+]/g, '');
    const digits = normalize(raw);

    const all = await prisma.aygFoodsEmployee.findMany({
      where: { phone: { not: null } },
      include: {
        location: { select: { id: true, name: true } },
        manager:  { select: { id: true, name: true, email: true } },
        review:   true,
        callLogs: callLogInclude,
      },
      orderBy: { createdAt: 'desc' },
    });

    const matches = all.filter(c => {
      if (!c.phone) return false;
      const stored = normalize(c.phone);
      return stored === digits || stored.endsWith(digits) || digits.endsWith(stored);
    });

    if (!matches.length) {
      res.status(404).json({ found: false, employees: [], message: 'No employee found with this phone number' });
      return;
    }

    const withOutcome = matches.map(m => ({
      ...m,
      callStatus: deriveCallOutcome(m),
      daysSinceStart: daysSinceStart(m.employeeStart),
    }));

    res.json({ found: true, total: withOutcome.length, employees: withOutcome });
  } catch (err) {
    next(err);
  }
}
