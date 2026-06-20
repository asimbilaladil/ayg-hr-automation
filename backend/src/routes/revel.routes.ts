import { Router } from 'express';
import { auth } from '../middleware/auth';
import { rbac } from '../middleware/rbac';
import { triggerSync, listEmployees, markCalled } from '../controllers/revel.controller';

const router = Router();

router.use(auth);

// GET  /api/revel/employees  — list all synced 30-day employees
router.get('/employees', listEmployees);

// POST /api/revel/sync                — manually trigger a sync (admin only)
router.post('/sync', rbac('ADMIN'), triggerSync);

// PATCH /api/revel/employees/:id/called — mark employee as called / not called
router.patch('/employees/:id/called', markCalled);

export default router;
