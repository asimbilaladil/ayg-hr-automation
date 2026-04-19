import { Router } from 'express';
import { auth } from '../middleware/auth';
import { rbac, rbacExact } from '../middleware/rbac';
import * as ctrl from '../controllers/users.controller';

const router = Router();

router.get('/me', auth, ctrl.me);
router.post('/me/change-password', auth, ctrl.changePassword);  // any logged-in user
router.get('/', auth, rbac('ADMIN'), ctrl.list);
router.patch('/:id/role', auth, rbac('ADMIN'), ctrl.updateRole);
router.patch('/:id/deactivate', auth, rbac('ADMIN'), ctrl.deactivate);

// Admin + HR only: edit email and reset password
router.patch('/:id/email', auth, rbacExact('ADMIN', 'HR'), ctrl.updateEmail);
router.post('/:id/reset-password', auth, rbacExact('ADMIN', 'HR'), ctrl.resetPassword);

export default router;
