import { Request, Response } from 'express';
import { SignJWT } from 'jose';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma';
import { env } from '../config/env';

const JWT_SECRET = new TextEncoder().encode(env.JWT_SECRET);
const TOKEN_TTL = '8h';

export async function login(req: Request, res: Response) {
  const { email, password } = req.body as { email?: string; password?: string };

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  // Domain check — only organisation emails allowed
  if (!email.toLowerCase().endsWith(`@${env.ORG_EMAIL_DOMAIN}`)) {
    return res.status(403).json({
      error: `Access restricted to @${env.ORG_EMAIL_DOMAIN} addresses`,
    });
  }

  // Find user
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });

  // Return generic message to avoid user enumeration
  if (!user || !user.passwordHash) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  if (!user.isActive) {
    return res.status(403).json({ error: 'Account deactivated. Contact an administrator.' });
  }

  // Verify password
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  // Issue JWT
  const token = await new SignJWT({
    sub: user.id,
    email: user.email,
    role: user.role,
    name: user.name,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(TOKEN_TTL)
    .sign(JWT_SECRET);

  return res.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
    token,
  });
}
