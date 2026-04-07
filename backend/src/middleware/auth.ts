import { Request, Response, NextFunction } from 'express';
import { createRemoteJWKSet, jwtVerify } from 'jose';
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

const jwksCache = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

function getJWKS() {
  const uri = env.AZURE_JWKS_URI;
  if (!jwksCache.has(uri)) {
    jwksCache.set(uri, createRemoteJWKSet(new URL(uri)));
  }
  return jwksCache.get(uri)!;
}

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
    const JWKS = getJWKS();
    const { payload } = await jwtVerify(token, JWKS, {
      issuer: `https://login.microsoftonline.com/${env.AZURE_TENANT_ID}/v2.0`,
      audience: env.AZURE_CLIENT_ID,
    });

    // Import prisma lazily to avoid circular deps
    const { prisma } = await import('../lib/prisma');
    const azureId = payload.oid as string;
    const email = (payload.preferred_username || payload.email || payload.upn) as string;

    let user = await prisma.user.findFirst({
      where: { OR: [{ azureId }, { email }] },
    });

    if (!user) {
      // Auto-provision user on first login
      user = await prisma.user.create({
        data: {
          email,
          name: (payload.name as string) || email,
          azureId,
          role: 'HR',
        },
      });
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
  } catch (err) {
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
