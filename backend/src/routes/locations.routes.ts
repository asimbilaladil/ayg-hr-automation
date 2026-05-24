import { Router } from 'express';
import { auth } from '../middleware/auth';
import { rbac } from '../middleware/rbac';
import * as ctrl from '../controllers/locations.controller';

const router = Router();

// All authenticated roles can read; controller filters by role
router.get('/', auth, rbac('HR'), ctrl.list);
router.get('/:id/address', auth, rbac('HR'), ctrl.getAddress);
router.get('/:id', auth, rbac('HR'), ctrl.getById);

// All roles can update (MANAGER restricted to address-only on their location)
router.patch('/:id', auth, rbac('HR'), ctrl.update);

// Create and delete are ADMIN-only
router.post('/', auth, rbac('ADMIN'), ctrl.create);
router.delete('/:id', auth, rbac('ADMIN'), ctrl.remove);

export default router;
