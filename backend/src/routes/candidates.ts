import { Router } from 'express';
import { auth, apiKeyAuth } from '../middleware/auth';
import { rbac } from '../middleware/rbac';
import * as ctrl from '../controllers/candidates.controller';

const router = Router();

// n8n endpoints (API key only)
router.get('/by-email/:emailId', apiKeyAuth, ctrl.getByEmailId);
router.get('/by-phone/:phone', apiKeyAuth, ctrl.getByPhone);     // inbound call lookup
router.post('/', apiKeyAuth, ctrl.create);
router.patch('/:emailId/ai-review', apiKeyAuth, ctrl.updateAIReview);
router.patch('/:emailId/call-result', apiKeyAuth, ctrl.updateCallResult);
router.patch('/id/:candidateId/ai-review', apiKeyAuth, ctrl.updateAIReviewById);
router.patch('/id/:candidateId/call-result', apiKeyAuth, ctrl.updateCallResultById);
router.post('/reset-problematic', apiKeyAuth, ctrl.resetProblematic);
router.patch('/:emailId/status', apiKeyAuth, ctrl.updateStatus);
router.delete('/:id', apiKeyAuth, ctrl.remove);

// Frontend endpoints (JWT)
router.get('/', auth, rbac('HR'), ctrl.list);
router.get('/resume/:emailId', auth, rbac('HR'), ctrl.getResume);
router.get('/:id', auth, rbac('HR'), ctrl.getById);
router.patch('/:id', auth, rbac('HR'), ctrl.update);
router.delete('/:id', auth, rbac('ADMIN'), ctrl.remove);

export default router;
