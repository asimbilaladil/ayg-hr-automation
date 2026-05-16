import { Router } from 'express';
import { auth } from '../middleware/auth';
import * as ctrl from '../controllers/notifications.controller';

const router = Router();

router.get('/', auth, ctrl.list);
router.patch('/read-all', auth, ctrl.markAllRead);
router.patch('/:id/read', auth, ctrl.markOneRead);

export default router;
