import { Router } from 'express';
import { auth, apiKeyAuth } from '../middleware/auth';
import { rbac } from '../middleware/rbac';
import * as ctrl from '../controllers/candidates.controller';

const router = Router();

// n8n endpoints (API key only)
router.get('/by-email/:emailId', apiKeyAuth, ctrl.getByEmailId);
router.post('/', apiKeyAuth, ctrl.create);
router.patch('/:emailId/ai-review', apiKeyAuth, ctrl.updateAIReview);
router.patch('/:emailId/call-result', apiKeyAuth, ctrl.updateCallResult);
router.post('/reset-problematic', apiKeyAuth, ctrl.resetProblematic);

// Frontend endpoints (JWT)
router.get('/', auth, rbac('HR'), ctrl.list);
router.get('/:id', auth, rbac('HR'), ctrl.getById);
router.patch('/:id', auth, rbac('HR'), ctrl.update);
router.delete('/:id', auth, rbac('ADMIN'), ctrl.remove);

export default router;
