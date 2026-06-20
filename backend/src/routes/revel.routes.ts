import { Router } from 'express';
import { auth } from '../middleware/auth';
import { rbac } from '../middleware/rbac';
import { triggerSync, listEmployees } from '../controllers/revel.controller';

const router = Router();

router.use(auth);

// GET  /api/revel/employees  — list all 30-day employees stored in DB
router.get('/employees', listEmployees);

// POST /api/revel/sync       — manually trigger a full sync from Revel (admin only)
router.post('/sync', rbac('ADMIN'), triggerSync);

export default router;
