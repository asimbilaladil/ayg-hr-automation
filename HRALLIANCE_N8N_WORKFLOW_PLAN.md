# HR Alliance → n8n workflow: build plan

## Context

The backend side is done and live (see `HRALLIANCE_INTEGRATION_PLAN.md`, merged): `POST /api/candidates/bulk-import` and `GET`/`PUT /api/sync-cursor/:key` exist and are verified working. This doc is the node-by-node plan for the n8n workflow that calls HR Alliance and feeds those endpoints. It's buildable today except for a few fields marked **[TBD]** — those need live discovery against HR Alliance with your AllPay username/password/API token (Part F of the integration plan), since their manual doesn't publish field-level schemas for the applicant-tracking objects. Everything else here is concrete and can be wired up now.

One workflow, one Schedule Trigger, running every 15–30 minutes.

## Node-by-node

### 1. Schedule Trigger
Every 15–30 min. This is the only trigger — no webhook, since HR Alliance has no push/webhook mechanism.

### 2. Build HR Alliance auth block (Set / Code node)
Constructs the `authorization` object every run (it expires after 6 minutes, so it can't be built once and reused):
```json
{
  "requestExpiration": "<now + 5 minutes, ISO 8601>",
  "userName": "<from n8n credential>",
  "password": "<accountPassword><apiToken>",  // concatenated, no separator
  "userType": 0,
  "loginToken": ""
}
```
Store `userName`/`accountPassword`/`apiToken` in an n8n **Credential** (generic HTTP header/basic auth credential, or a custom one), not hardcoded in the node — this is the one piece of secret material in the whole workflow.

### 3. Get sync cursor (HTTP Request)
```
GET {{BACKEND_URL}}/api/sync-cursor/hralliance:applicants
Header: X-API-Key: {{N8N_API_KEY}}
```
Returns `{ value: null }` on the very first run ever. Branch here: if `value` is null, use a far-past lower bound for step 5 (full backfill); otherwise use `value` minus a few minutes as the lower bound (overlap buffer).

### 4. Get live postings (HTTP Request, HR Alliance)
```
POST https://api2.hralliance.net/AllPayRestData.svc/json/load
Body: {
  "authorization": { ...from step 2 },
  "objectType": "CJob",              // or CPosition — [TBD which one, or both, per discovery]
  "filter": "<open/active status filter>",   // [TBD exact field/value]
  "sortOrder": null,
  "queryOptions": { "batchSize": 200, "startRecord": 0 }
}
```
Result is the live-postings lookup table used in step 6 to resolve each applicant's `postingName` + `location`. If a single call doesn't cover the full postings list (unlikely at this volume), paginate the same way as step 5.

### 5. Get new applicants (HTTP Request loop, HR Alliance)
```
POST https://api2.hralliance.net/AllPayRestData.svc/json/load
Body: {
  "authorization": { ...from step 2 },
  "objectType": "EAppl",             // or EApplPositions — [TBD which carries applied-date + status]
  "filter": "appliedDate > '<cursor - buffer>'",   // [TBD exact field name for applied/created date]
  "sortOrder": "appliedDate",
  "queryOptions": { "batchSize": 100, "startRecord": 0 }
}
```
**Pagination loop**: if `recordCount` returned equals `batchSize`, loop back with `startRecord += batchSize`; stop when a page comes back short. This is what actually gets everyone, not just the first page — see the earlier "10 old + 40 new" discussion in the main plan for why this matters.

**[TBD, part of Part E discovery]**: confirm whether `getLastChangeTime` + `ESyncedChanges`/`CSyncedChanged` is a cleaner primitive than a raw date filter on `EAppl` — if so, swap this node's query accordingly, the rest of the workflow is unaffected either way.

### 6. Map each applicant → candidate shape (Code node)
For each record from step 5, build:
```js
{
  postingName: /* from step 4 lookup, keyed by applicant's position/job field [TBD] */,
  location: /* from step 4 lookup [TBD] */,
  candidateName: /* firstName + lastName [TBD exact field names] */,
  phone: /* [TBD] */,
  dateApplied: /* human-readable date, from the same field used in the filter */,
  externalId: /* the applicant's stable GUID [TBD field name — likely `guidfield` or similar per the generic object pattern] */,
  status: "pending",
}
```
This is the item that resolves ambiguity from HR Alliance's raw job/position code into the `postingName`/`location` strings our backend's `findOrCreatePosting`/`findOrCreateLocation` expect (case-insensitive match, auto-creates on miss — so getting this mapping close matters, or you'll get duplicate postings; see the main plan's Part D note).

### 7. Fetch resume (sub-flow, per applicant)
1. `Load` on `EApplDocs` filtered by the applicant's ID — [TBD: exact link field, and whether an applicant can have multiple documents].
2. `GetOneTimeDocumentDownloadURL` with the document's GUID and `docType` — [TBD: which `docType` value applies to an applicant resume; the manual only confirms 0/2/3 for employee doc/photo/onboarding doc, not applicant resumes specifically — this needs live confirmation].
3. HTTP Request (binary) against the returned one-time URL to download the PDF bytes.
4. Write the file to `/root/.n8n-files/resumes/{candidateName replace spaces with _}_{externalId}_Resume.pdf` (same convention the current pipeline already uses — the backend's `getResume` already knows how to serve this path directly, zero backend change needed).
5. Set `resumeUrl` on the mapped item to that path.

Only run this for applicants actually returned by step 5 (new-since-cursor) — not for every live posting's full history — so resumes are fetched once per candidate, not on every run.

### 8. Aggregate into one array
Collect all mapped items from steps 6–7 into a single array (n8n's Aggregate/Merge node), matching `bulk-import`'s expected body shape.

### 9. Push to backend (HTTP Request)
```
POST {{BACKEND_URL}}/api/candidates/bulk-import
Header: X-API-Key: {{N8N_API_KEY}}
Body: { "candidates": [ ...step 8 output ] }
```
Response is a per-item `{ externalId, ok, candidateId?, error? }` array — log any `ok: false` entries (e.g. to n8n's execution log or a Slack/email alert node) rather than silently dropping them.

### 10. Advance the cursor (HTTP Request) — only on success
```
PUT {{BACKEND_URL}}/api/sync-cursor/hralliance:applicants
Header: X-API-Key: {{N8N_API_KEY}}
Body: { "value": "<newest appliedDate seen across step 5's results>" }
```
Only reached if step 9 didn't hard-fail. If step 5 returned zero new applicants this run, skip this node entirely (nothing to advance to) rather than writing the same value back.

## What to build now vs. wait on

Buildable today, no HR Alliance access needed: 1, 2 (structure), 3, 8, 9, 10 (structure).
Needs your credentials + Part E discovery to fill in the **[TBD]** blanks: 4, 5, 6, 7, and the real value going into node 2's `password` field.

## Testing

1. Run the workflow manually once discovery confirms the [TBD] fields, with the Schedule Trigger disabled — check the execution log at each node.
2. Confirm step 9's response shows `ok: true` for each candidate, and that a re-run (same applicants still in the "new-since-cursor" window, e.g. from a shortened lookback) doesn't create duplicates — check via the backend's `GET /api/candidates/by-external-id/:externalId`.
3. Confirm a resume file lands in `/root/.n8n-files/resumes/` and is viewable via the frontend's candidate detail view.
4. Only then enable the Schedule Trigger.
