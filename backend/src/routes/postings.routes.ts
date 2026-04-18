import { Router } from 'express';
import { auth } from '../middleware/auth';
import { rbac } from '../middleware/rbac';
import * as ctrl from '../controllers/postings.controller';

const router = Router();

// HR can view postings
router.get('/list', auth, rbac('HR'), ctrl.list);

// Admin-only endpoints for posting management
router.get('/', auth, rbac('ADMIN'), ctrl.list);
router.get('/:id', auth, rbac('ADMIN'), ctrl.getById);
router.post('/', auth, rbac('ADMIN'), ctrl.create);
router.patch('/:id', auth, rbac('ADMIN'), ctrl.update);
router.delete('/:id', auth, rbac('ADMIN'), ctrl.remove);

export default router;
