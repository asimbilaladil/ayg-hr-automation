import { Router } from 'express';
import { auth, apiKeyAuth } from '../middleware/auth';
import { rbac } from '../middleware/rbac';
import { triggerSync, listEmployees, markCalled, updateEmployee, upsertReview, getReview, getCandidateByPhone } from '../controllers/revel.controller';

const router = Router();

// n8n endpoints (API key only — must be registered before router.use(auth))
router.get('/candidates/by-phone/:phone', apiKeyAuth, getCandidateByPhone);

router.use(auth);

// GET  /api/revel/employees  — list all synced 30-day employees
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

export default router;
