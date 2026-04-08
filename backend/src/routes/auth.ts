import { Router } from 'express';
import { login } from '../controllers/auth.controller';

const router = Router();

/**
 * POST /api/auth/login
 * Body: { email: string, password: string }
 * Returns: { user: { id, email, name, role }, token: string }
 */
router.post('/login', login);

export default router;
