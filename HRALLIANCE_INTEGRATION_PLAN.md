# Replace ADP with HR Alliance as the candidate source

## Context

Candidates used to arrive via an external ADP-fed email → n8n → `POST /api/candidates` pipeline. That external service is gone; the plan is to have n8n pull job postings, applicants, and resumes directly from HR Alliance's (Alliance Payroll / "AllPay") JSON API and feed them into this backend instead. The backend itself has no ADP-specific code to remove — the ingestion endpoint was always source-agnostic — so this is mostly about (1) fixing a naming/identity problem the old email-based design left behind, and (2) adding an ingestion contract that fits a polling-based sync instead of an event-per-email one.

The one piece of real debt: every candidate's stable identifier is a DB column literally called `emailId`, documented as "the Gmail message ID," and threaded through 5 routes, ~20 backend call sites, 4 frontend files, and (confirmed by you) a lot of existing n8n nodes. HR Alliance applicants have no Gmail message ID. Since the system isn't live yet and you're willing to update the n8n workflows in lockstep, we're fixing this now rather than overloading a misleading field name permanently: **`emailId` → `externalId`**, done as one atomic rename across backend, frontend, and docs, with a full before/after contract table handed to you for the n8n side.

HR Alliance itself is a generic payroll/HRIS object-CRUD API (`Load`/`Save`/`GetProtoObject` over 200+ object types), not a dedicated ATS — there's no documented "list open jobs" or "list applicants" endpoint. The manual doesn't publish field-level schemas for the applicant-tracking objects (`EAppl`, `CJob`, `CPosition`, `EApplDocs`, etc.), so exact field names/status values must be discovered live via `GetProtoObject` + a sample `Load` call once you share credentials. That discovery step gates the final field-mapping spec, but not the backend code changes below, which don't depend on HR Alliance's exact schema.

## Part A — Rename `emailId` → `externalId` (repo-wide)

Straight rename, same semantics (unique, required, used as the sync key for create/lookup/patch). No new field, no dual-write shim — old field goes away entirely.

**Backend:**
- `backend/prisma/schema.prisma` — `Candidate.emailId` → `externalId`. New migration (do **not** edit the already-applied `20260416214327_add_manager_to_language/migration.sql`): `ALTER TABLE "Candidate" RENAME COLUMN "emailId" TO "externalId"` + rename the unique index.
- `backend/src/schemas/candidate.schema.ts` — `CreateCandidateSchema.emailId` → `externalId`.
- `backend/src/routes/candidates.ts` — rename both the param and, where "email" appears in the path itself, the path segment too (n8n will need the new URLs, not just a field rename):
  - `GET /by-email/:emailId` → `GET /by-external-id/:externalId`
  - `PATCH /:emailId/ai-review` → `PATCH /:externalId/ai-review`
  - `PATCH /:emailId/call-result` → `PATCH /:externalId/call-result`
  - `PATCH /:emailId/status` → `PATCH /:externalId/status`
  - `GET /resume/:emailId` → `GET /resume/:externalId` (also used by the frontend — update in lockstep)
- `backend/src/controllers/candidates.controller.ts` — rename `sanitizeEmailId`→`sanitizeExternalId`, `getByEmailId`→`getByExternalId`, all internal `emailId` locals/destructures, and stale comments.
- `backend/src/services/candidates.service.ts` — rename `getCandidateByEmailId`→`getCandidateByExternalId`, all `where: { emailId }` → `where: { externalId }`, the `deleteCandidate` OR-lookup, `updateCandidateStatus`, `updateAIReview`, `updateCallResult`, `getResume` (including the `${externalId}_Resume.pdf` filename construction and log lines).
- `backend/src/swagger/setup.ts` — update the `Candidate` schema property, the POST body's required list + example, the 409 description, and the three path definitions (`/candidates/by-external-id/{externalId}`, `/candidates/{externalId}/ai-review`, `/candidates/{externalId}/call-result`).
- `backend/src/ai-calling-prompt/prompt.json` (line ~64) — `"candidateEmail": "{{ $json.emailId }}"` → `"{{ $json.externalId }}"`. This is a repo-side mirror of a Vapi assistant config — flag to you that the **live** Vapi/n8n copy needs the same edit.

**Frontend** (4 files, all currently reading `candidate.emailId` off API responses — renaming the DB column changes the JSON key automatically since `flattenCandidate` spreads the raw row):
- `frontend/src/api/index.js` — `getResume(emailId)` param/URL.
- `frontend/src/views/CandidatesView.vue` — `c.emailId` guard + resume URL build.
- `frontend/src/views/CandidateDetailView.vue` — displayed field + resume URL computed.
- `frontend/src/components/candidates/CandidateDrawer.vue` — displayed field, `editForm.emailId`, resume URL build, `hasResume` computed.
- **Also fix the pre-existing mislabel while touching these lines**: `CandidateDetailView.vue`/`CandidateDrawer.vue` show this field under the label **"Email"** with `type="email"`, even though it never held a real email address. Relabel to "Application ID" (or similar) and change the disabled input to `type="text"`. This isn't scope creep — it's the same lines, and it stops being even superficially plausible once HR Alliance candidates have no email-derived value here at all.

**Docs:** update `HANDOVER.md` and `backend/README.md` (both are living docs, ~24 occurrences total). Leave `FRONTEND_CHANGES_SUMMARY.md` alone — it's a historical changelog of a past change, not a spec to keep in sync.

**Not touched:** `/id/:candidateId/ai-review` and `/id/:candidateId/call-result` (already CUID-based, unaffected), `prisma/seed.ts` (no candidate data), no test suite exists.

## Part B — New bulk-ingest endpoint (upsert, not create-only)

The existing `POST /api/candidates` is create-only and 409s on a duplicate `externalId`. That's fine for an event-per-email trigger, but HR Alliance will be *polled* — the same applicant will reappear on every poll until you stop tracking them, so a hard-create endpoint forces n8n into an extra existence-check round trip per candidate. Add:

`POST /api/candidates/bulk-import` in `backend/src/routes/candidates.ts`, same `apiKeyAuth` middleware as every other n8n route (reuse `env.N8N_API_KEY`, no new secret needed since n8n is still the caller).

- Body: `{ candidates: [ { postingName, location, candidateName, phone?, dateApplied?, hiringManager?, status?, externalId, resumeUrl? }, ... ] }` — same shape as `CreateCandidateSchema`, as an array.
- New service function `bulkImportCandidates` in `candidates.service.ts`: for each item, look up by `externalId`; if missing, create it (reusing the existing `findOrCreatePosting`/`findOrCreateLocation`/`findOrCreateManager` helpers, same as `createCandidate` does today); if found, **update only the source-of-truth fields** (`name`, `phone`, `dateApplied`, `resumeUrl`, `postingId`, `locationId`, `hiringManagerId`) — never touch `aiScore`/`status`/`transcript`/`interviewAnswers`/appointment fields, which belong to later pipeline stages once set.
- Response: per-item result array `{ externalId, ok, candidateId?, error? }` so one bad record doesn't fail the whole batch.
- Leave the single-item `POST /api/candidates` route as-is (still valid for one-off use).

## Part C — Sync cursor endpoints (backend-held incremental pointer)

Needed so a run only pulls *new* applicants instead of re-pulling everyone still pending every time. Without this, if a posting goes live and gets 10 applicants in the first 15 minutes, the next run (now at 50 total, 40 new) would re-fetch and re-process all 50 — including re-downloading resumes for the 10 you already have — every single run, with that waste compounding as the pending queue grows. See Part E for how this plugs into the sync.

- New Prisma model, e.g. `SyncCursor { key String @id, value String, updatedAt DateTime @updatedAt }` — generic key/value so it can track more than one cursor if needed (e.g. `hralliance:applicants`).
- `GET /api/sync-cursor/:key` — n8n calls this at the **start** of a run. Returns `{ key, value: null }` if never set (first-ever run → n8n does a one-time full backfill instead of a delta).
- `PUT /api/sync-cursor/:key` with `{ value }` — n8n calls this at the **end** of a successful run, set to the newest `appliedDate` (or equivalent) it actually saw. Both routes use `apiKeyAuth`, same as every other n8n-facing route.
- This is intentionally dumb storage — the backend doesn't interpret the value, just persists whatever string n8n hands it. All the "what counts as new" logic stays in n8n/HR Alliance's query, not here.

## Part D — Small postings fix

`GET /api/postings` already accepts `isActive` in its Zod query schema (`posting.schema.ts`) but `postings.controller.ts`'s `list` ignores it and calls `service.listPostings()` unfiltered. Wire the filter through so n8n (or you) can pull the canonical "live" posting list via `GET /api/postings?isActive=true` — useful for validating/aliasing HR Alliance job titles against our Posting names before a sync run, since `Posting`/`Location` are still resolved by case-insensitive name match with auto-create on miss (unchanged behavior — flagging it because HR Alliance's raw job-title strings won't necessarily match ours, so a mismatch silently creates a new duplicate Posting rather than erroring).

## Part E — Sync strategy: how n8n knows what's new

The cron/polling logic lives entirely in n8n, not the backend — the backend stays passive and only reacts to whatever n8n sends to `bulk-import`/the cursor endpoints. This mirrors nothing currently in this repo except loosely the Revel sync (`backend/src/revel/`), except that one polls *from inside* this backend on its own cron; HR Alliance doesn't need that since n8n is already the orchestrator/trigger here.

- **Frequency**: n8n Schedule Trigger, every 15–30 min. No backend cron job.
- **Live postings**: each run, `Load` on `CJob`/`CPosition` filtered by whatever field marks a posting open/active (exact field confirmed in Part F discovery) — gives the current set of live postings, used to resolve each applicant's `postingName` + `location`.
- **Incremental pull via the Part C cursor**: at the start of a run, `GET /api/sync-cursor/hralliance:applicants`. Query HR Alliance's `EAppl`/`EApplPositions` with a filter like `appliedDate > <cursor value minus a few minutes>` (the small buffer protects against a record landing exactly on the boundary or clock skew between our server and theirs) — this is what actually gets "only the 40 new ones," not the whole pending set. At the end of a successful run, `PUT` the cursor forward to the newest `appliedDate` seen. First-ever run (cursor empty) does a one-time full backfill.
- **Pagination within a run**: `Load` takes `queryOptions: { batchSize, startRecord }`. To get every new applicant, not just the first page, n8n loops the HTTP Request node — `startRecord: 0`, then `+batchSize` each pass — until a page comes back shorter than `batchSize` (end reached). Independent of the cursor above — this just exhausts one query.
- **Upsert as the safety net, not the primary mechanism**: the small overlap buffer means a run can occasionally re-see a record it already has (e.g. a straggler right at the cursor boundary). That's fine specifically because Part B's `bulk-import` upserts by `externalId` — re-sending an already-known candidate just re-writes the same source fields (harmless no-op), never touches AI-review/call/appointment state, never duplicates.
- **Resume retrieval**: per applicant returned by the incremental query, look up their `EApplDocs` record(s), call `GetOneTimeDocumentDownloadURL`, download the bytes, save to the existing shared path `/root/.n8n-files/resumes/{Name}_{externalId}_Resume.pdf`, and pass that path as `resumeUrl` — `getResume`'s existing local-path handling picks it up with no backend change. Because the query is already scoped to new-since-cursor, resumes are only fetched once per candidate, not on every run.

## Part F — HR Alliance discovery (needs your credentials, gates the mapping spec only)

Once you share the AllPay username, password, and API token (concatenated per their auth header spec: `password = accountPassword + apiToken`, `requestExpiration` ≤ 6 min ahead, `userType: 0`, `loginToken: ""`):

1. One-off script (not committed with secrets — creds passed via local env when run) that calls `POST .../json/GetProtoObject` for `CJob`, `CPosition`, `EAppl`, `EApplPositions`, `EApplDocs`, `EApplAnswers`, `CApplQuestions` to get real field names/types.
2. Small `Load` calls (`batchSize` ~5) against `CJob`/`CPosition` and `EAppl` to see real values — which field marks a job open/live, which field ties a position to a store/location, applicant name/phone/applied-date/status fields, how `EApplPositions` links applicant↔position, and — critically for Part E — confirm there's a usable applied/created-date field to drive the incremental filter (or whether `getLastChangeTime`/`ESyncedChanges` is a cleaner primitive for the same purpose).
3. One `GetOneTimeDocumentDownloadURL` call against a real `EApplDocs` record to confirm the resume-retrieval flow end to end (this returns a one-time signed URL — the bytes need to be downloaded and saved by n8n to `/root/.n8n-files/resumes/{Name}_{externalId}_Resume.pdf`, the same convention the current pipeline already uses, so `resumeUrl` can be set to that local path).

## Part G — Deliverable: field-mapping spec for your n8n rebuild

After Part F, a short doc with: the exact HR Alliance object/filter to call for live postings and for new-since-cursor applicants, the confirmed field → `Candidate` field mapping, the pagination loop pattern, the cursor read/write points in the workflow, the two-step resume download, and full example payloads matching the new `/api/candidates/bulk-import` and `/api/sync-cursor/:key` contracts — plus the complete before/after table of every URL and field name Part A renamed, so you can search-and-replace across your n8n workflows.

## Verification

- `cd backend && npx prisma migrate dev` generates and applies the rename migration cleanly; `npx tsc --noEmit` passes.
- Manually hit (via curl, with `X-API-Key`): `POST /api/candidates/bulk-import` with a small array (new + one repeated `externalId`) — confirm create + update-in-place semantics and the AI/status fields aren't clobbered on the second call.
- `GET /api/candidates/by-external-id/:externalId`, `PATCH /:externalId/ai-review`, `PATCH /:externalId/call-result`, `PATCH /:externalId/status` — confirm all four work under the new path/param name.
- `GET /api/postings?isActive=true` returns only active postings.
- `GET /api/sync-cursor/hralliance:applicants` returns `value: null` before it's ever set; `PUT` it, then `GET` again and confirm the new value persists.
- Start the frontend, open a candidate: confirm the detail view/drawer render (new label, no more raw `emailId` references), and resume viewing still works end-to-end via `GET /api/candidates/resume/:externalId`.
- Part F discovery script run manually against HR Alliance once you provide credentials — not part of automated verification.
