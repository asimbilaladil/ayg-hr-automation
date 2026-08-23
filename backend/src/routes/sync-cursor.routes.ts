import { Router } from 'express';
import { apiKeyAuth } from '../middleware/auth';
import * as ctrl from '../controllers/sync-cursor.controller';

const router = Router();

// n8n endpoints only — no frontend UI for this
router.get('/:key', apiKeyAuth, ctrl.get);
router.put('/:key', apiKeyAuth, ctrl.set);

export default router;
