import { Router } from 'express';
import { auth, apiKeyAuth } from '../middleware/auth';
import { rbac } from '../middleware/rbac';
import * as ctrl from '../controllers/candidates.controller';

const router = Router();

// n8n endpoints (API key only)
router.get('/by-external-id/:externalId', apiKeyAuth, ctrl.getByExternalId);
router.get('/by-phone/:phone', apiKeyAuth, ctrl.getByPhone);     // inbound call lookup
router.post('/', apiKeyAuth, ctrl.create);
router.post('/bulk-import', apiKeyAuth, ctrl.bulkImport);
router.patch('/:externalId/ai-review', apiKeyAuth, ctrl.updateAIReview);
router.patch('/:externalId/call-result', apiKeyAuth, ctrl.updateCallResult);
router.patch('/id/:candidateId/ai-review', apiKeyAuth, ctrl.updateAIReviewById);
router.patch('/id/:candidateId/call-result', apiKeyAuth, ctrl.updateCallResultById);
router.post('/reset-problematic', apiKeyAuth, ctrl.resetProblematic);
router.patch('/:externalId/status', apiKeyAuth, ctrl.updateStatus);
router.delete('/:id', apiKeyAuth, ctrl.remove);

// Frontend endpoints (JWT)
router.get('/', auth, rbac('HR'), ctrl.list);
router.get('/resume/:externalId', auth, rbac('HR'), ctrl.getResume);
router.get('/:id', auth, rbac('HR'), ctrl.getById);
router.patch('/:id', auth, rbac('HR'), ctrl.update);
router.delete('/:id', auth, rbac('ADMIN'), ctrl.remove);

export default router;
