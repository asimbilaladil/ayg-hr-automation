import { Router } from 'express';
import { auth, apiKeyAuth } from '../middleware/auth';
import { rbac } from '../middleware/rbac';
import * as ctrl from '../controllers/appointments.controller';

const router = Router();

// n8n booking endpoint
router.post('/', apiKeyAuth, ctrl.create);

// Frontend endpoints
router.get('/', auth, rbac('HR'), ctrl.list);
router.get('/:id', auth, rbac('HR'), ctrl.getById);
router.patch('/:id', auth, rbac('MANAGER'), ctrl.update);
router.delete('/:id', auth, rbac('MANAGER'), ctrl.remove);

// Cancel endpoints (HR+ can cancel any; MANAGER scoped in controller)
router.post('/bulk-cancel', auth, rbac('HR'), ctrl.bulkCancel);
router.delete('/:id/cancel', auth, rbac('HR'), ctrl.cancel);

export default router;
