import { Request, Response, NextFunction } from 'express';
import { jwtVerify } from 'jose';
import { env } from '../config/env';

export interface AuthUser {
  id: string;
  email: string;
  role: string;
  name: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
      isN8N?: boolean;
    }
  }
}

// Pre-encode the secret once at startup
const JWT_SECRET = new TextEncoder().encode(env.JWT_SECRET);

export async function auth(req: Request, res: Response, next: NextFunction) {
  // 1. Check n8n API key
  const apiKey = req.headers['x-api-key'];
  if (apiKey) {
    if (apiKey === env.N8N_API_KEY) {
      req.isN8N = true;
      return next();
    }
    return res.status(401).json({ error: 'Invalid API key' });
  }

  // 2. Check Bearer JWT
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No authorization provided' });
  }

  const token = authHeader.slice(7);

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET, {
      algorithms: ['HS256'],
    });

    const { prisma } = await import('../lib/prisma');

    const user = await prisma.user.findUnique({
      where: { id: payload.sub as string },
    });

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    if (!user.isActive) {
      return res.status(403).json({ error: 'Account deactivated' });
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    };

    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function apiKeyAuth(req: Request, res: Response, next: NextFunction) {
  const apiKey = req.headers['x-api-key'];
  if (apiKey === env.N8N_API_KEY) {
    req.isN8N = true;
    return next();
  }
  return res.status(401).json({ error: 'Invalid API key' });
}
