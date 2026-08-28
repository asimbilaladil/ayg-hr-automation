import { Router } from 'express';
import { auth, apiKeyAuth } from '../middleware/auth';
import { rbac } from '../middleware/rbac';
import { triggerSync, listEmployees, markCalled, updateEmployee, postCallLog, upsertReview, getReview, getRecording, getCandidateByPhone, resetTestRecord, createTestRecord } from '../controllers/revel.controller';

const router = Router();

// n8n endpoints (API key only — must be registered before router.use(auth))
router.get('/candidates/by-phone/:phone', apiKeyAuth, getCandidateByPhone);

router.use(auth);

// GET  /api/revel/employees  — list all synced 30-day employees
//   filters: ?establishmentId= &isActive=true|false &phone= &called=true|false
//            &callStatus=NOT_CALLED|SUCCESS|NO_ANSWER|VOICEMAIL|FAILED (comma-separated ok)
//            &hiredDaysAgo=30       → only employees whose start date is >= 30 days ago
//            &limit=50              → cap the number of rows returned
//            &nextCallAtBefore=<ISO> → only employees callable now (no cooldown, or expired)
//            &needsCall=true         → everyone not yet successfully reviewed (recommended for the workflow)
//   called=false      → employees the system has not marked as called
//   callStatus=SUCCESS → employees who completed the review on the call
//   n8n (x-api-key auth) automatically excludes employees still in a voicemail
//   cooldown — no query param needed; pass &includeCooldown=true to see them.
//   JWT/UI callers always see everyone.
//   each returned employee also carries derived `callStatus`, `daysSinceStart`,
//   and `callLogs` (up to 15 most-recent call attempts, newest first)
router.get('/employees', listEmployees);

// POST /api/revel/sync                — manually trigger a sync (admin only)
router.post('/sync', rbac('ADMIN'), triggerSync);

// PATCH /api/revel/employees/:id              — update employee call state
//   body: { called?, calledAt?, nextCallAt?, lastCallAt?, endedReason?, status? }
//   endedReason/status containing "voicemail" auto-sets a 1-hour nextCallAt cooldown
router.patch('/employees/:id', updateEmployee);
// alias: some n8n nodes call the singular path — keep both working
router.patch('/employee/:id', updateEmployee);

// PATCH /api/revel/employees/:id/called       — mark employee as called / not called
router.patch('/employees/:id/called', markCalled);

// POST /api/revel/employees/:id/call-log      — append a call-attempt history row
//   body: { outcome?, endedReason?, status?, vapiCallId?, durationSec?, recordingUrl?, notes?, attemptedAt?, nextCallAt? }
//   also updates the employee rollup (lastCallAt / endedReason / voicemail cooldown)
router.post('/employees/:id/call-log', postCallLog);

// POST /api/revel/employees/:id/review        — create or update 30-day review
router.post('/employees/:id/review', upsertReview);

// GET  /api/revel/employees/:id/review        — fetch review for an employee
router.get('/employees/:id/review', getReview);

// GET  /api/revel/employees/:id/recording     — proxy the VAPI call recording (auth required on VAPI's side since July 2026)
router.get('/employees/:id/recording', getRecording);

// POST /api/revel/employees/:id/reset         — reset a test record (admin only, isTest=true only)
router.post('/employees/:id/reset', rbac('ADMIN'), resetTestRecord);

// POST /api/revel/employees/test              — create a new test record (admin only)
router.post('/employees/test', rbac('ADMIN'), createTestRecord);

export default router;
