import { Router } from 'express';
import { auth } from '../middleware/auth';
import { rbac } from '../middleware/rbac';
import * as ctrl from '../controllers/users.controller';

const router = Router();

router.get('/me', auth, ctrl.me);
router.get('/', auth, rbac('ADMIN'), ctrl.list);
router.patch('/:id/role', auth, rbac('ADMIN'), ctrl.updateRole);
router.patch('/:id/deactivate', auth, rbac('ADMIN'), ctrl.deactivate);

export default router;
