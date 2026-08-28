import { Router } from 'express';
import { auth, apiKeyAuth } from '../middleware/auth';
import { rbac } from '../middleware/rbac';
import { triggerSync, listEmployees, markCalled, updateEmployee, upsertReview, getReview, getRecording, getCandidateByPhone, resetTestRecord, createTestRecord } from '../controllers/revel.controller';

const router = Router();

// n8n endpoints (API key only — must be registered before router.use(auth))
router.get('/candidates/by-phone/:phone', apiKeyAuth, getCandidateByPhone);

router.use(auth);

// GET  /api/revel/employees  — list all synced 30-day employees
//   filters: ?establishmentId= &isActive=true|false &phone= &called=true|false
//            &callStatus=NOT_CALLED|SUCCESS|NO_ANSWER|VOICEMAIL|FAILED (comma-separated ok)
//   called=false      → employees the system has not marked as called
//   callStatus=SUCCESS → employees who answered the review questions on the call
//   each returned employee also carries a derived `callStatus` field
router.get('/employees', listEmployees);

// POST /api/revel/sync                — manually trigger a sync (admin only)
router.post('/sync', rbac('ADMIN'), triggerSync);

// PATCH /api/revel/employees/:id              — update employee (called, calledAt)
router.patch('/employees/:id', updateEmployee);

// PATCH /api/revel/employees/:id/called       — mark employee as called / not called
router.patch('/employees/:id/called', markCalled);

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
