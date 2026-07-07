import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { syncAygFoodsEmployees } from '../revel/revel.sync.service';
import { createNotification } from '../services/notifications.service';

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

    res.json(employee);
  } catch (err) {
    next(err);
  }
}

export async function updateEmployee(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { called, calledAt } = req.body as { called?: boolean; calledAt?: string };

    const employee = await prisma.aygFoodsEmployee.update({
      where: { id },
      data: {
        ...(called !== undefined && { called }),
        ...(called === true  && { calledAt: calledAt ? new Date(calledAt) : new Date() }),
        ...(called === false && { calledAt: null }),
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

    res.json(employee);
  } catch (err) {
    next(err);
  }
}

// Maps VAPI answer category → DB fields
const CATEGORY_MAP: Record<string, { notes: string; rating?: string }> = {
  'Role Experience':    { notes: 'q1Notes', rating: 'q1Rating' },
  'Training & Support': { notes: 'q2Notes', rating: 'q2Rating' },
  'Surprises':          { notes: 'q3Notes' },
  'Culture Fit':        { notes: 'q4Notes', rating: 'q4Rating' },
  'Accomplishments':    { notes: 'q5Notes' },
  'Clarity':            { notes: 'q6Notes' },
  'Clarity Needed':     { notes: 'q6Notes' },
  'Support Needed':     { notes: 'q7Notes' },
};

// Extract the last single-digit 1-5 rating mentioned in answer text
function extractRatingFromText(text: string): number | undefined {
  const matches = [...text.matchAll(/\b([1-5])\b/g)];
  if (!matches.length) return undefined;
  return Number(matches[matches.length - 1][1]);
}

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
function extractAnswerFromTranscript(turns: Turn[], question: string): string | null {
  const keywords = question.toLowerCase().split(/\s+/).filter(w => w.length > 4).slice(0, 6);
  const threshold = Math.min(3, Math.ceil(keywords.length * 0.5));

  let bestIdx = -1;
  for (let i = 0; i < turns.length; i++) {
    if (turns[i].role !== 'AI') continue;
    const hit = keywords.filter(kw => turns[i].text.toLowerCase().includes(kw)).length;
    if (hit >= threshold) bestIdx = i; // keep last match (handles rephrased questions)
  }
  if (bestIdx === -1) return null;

  const userTexts: string[] = [];
  for (let i = bestIdx + 1; i < turns.length; i++) {
    if (turns[i].role === 'User') {
      userTexts.push(turns[i].text);
    } else if (userTexts.length > 0) {
      break; // stop at next AI turn once we have user speech
    }
    // if no user speech yet and we hit another AI turn, keep scanning
  }
  return userTexts.length ? userTexts.join(' ') : null;
}

function mapAnswers(answers: Array<{ category: string; question?: string; answer: string; rating?: number }>) {
  const mapped: Record<string, any> = {};
  for (const a of answers) {
    const mapping = CATEGORY_MAP[a.category];
    if (!mapping) continue;
    if (a.answer) mapped[mapping.notes] = a.answer;
    if (mapping.rating) {
      const rating = a.rating != null ? Number(a.rating) : extractRatingFromText(a.answer);
      if (rating) mapped[mapping.rating] = rating;
    }
  }
  return mapped;
}

export async function upsertReview(req: Request, res: Response, next: NextFunction) {
  try {
    const id = req.params.id.replace(/^=+/, '');
    const {
      reviewType,
      q1Rating, q1Notes,
      q2Rating, q2Notes,
      q3Notes,
      q4Rating, q4Notes,
      q5Notes, q6Notes, q7Notes,
      overallNotes, reviewedAt,
      transcript, recordingUrl, callStatus, answers,
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
    const answersArr = rawAnswersArr.map(a => {
      if (!turns.length || !a.question) return a;
      const clean = extractAnswerFromTranscript(turns, a.question);
      return clean ? { ...a, answer: clean } : a;
    });

    const cleanedAnswersStr = answersArr.length ? JSON.stringify(answersArr) : answersStr;
    const fromAnswers = answersArr.length ? mapAnswers(answersArr) : {};

    const data = {
      reviewType,
      // explicit fields take precedence; fallback to auto-mapped
      q1Rating: q1Rating ?? fromAnswers.q1Rating,
      q1Notes:  q1Notes  ?? fromAnswers.q1Notes,
      q2Rating: q2Rating ?? fromAnswers.q2Rating,
      q2Notes:  q2Notes  ?? fromAnswers.q2Notes,
      q3Notes:  q3Notes  ?? fromAnswers.q3Notes,
      q4Rating: q4Rating ?? fromAnswers.q4Rating,
      q4Notes:  q4Notes  ?? fromAnswers.q4Notes,
      q5Notes:  q5Notes  ?? fromAnswers.q5Notes,
      q6Notes:  q6Notes  ?? fromAnswers.q6Notes,
      q7Notes:  q7Notes  ?? fromAnswers.q7Notes,
      overallNotes,
      transcript, recordingUrl, callStatus,
      answers: cleanedAnswersStr,
      reviewedAt: reviewedAt ? new Date(reviewedAt) : new Date(),
    };

    const review = await prisma.onboardingReview.upsert({
      where: { employeeId: id },
      create: { employeeId: id, ...data },
      update: data,
    });

    // also mark employee as called
    const employee = await prisma.aygFoodsEmployee.update({
      where: { id },
      data: { called: true, calledAt: review.reviewedAt },
      include: { manager: true },
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

export async function listEmployees(req: Request, res: Response, next: NextFunction) {
  try {
    const { establishmentId, isActive, phone } = req.query;

    const employees = await prisma.aygFoodsEmployee.findMany({
      where: {
        ...(establishmentId ? { establishmentId: Number(establishmentId) } : {}),
        ...(isActive !== undefined ? { isActive: isActive === 'true' } : {}),
        ...(phone ? { phone: { contains: String(phone) } } : {}),
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
      orderBy: [{ establishmentId: 'asc' }, { lastName: 'asc' }],
    });

    res.json({ total: employees.length, employees });
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

    res.json({ found: true, total: matches.length, employees: matches });
  } catch (err) {
    next(err);
  }
}
