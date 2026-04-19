import { prisma } from '../lib/prisma';
import bcrypt from 'bcryptjs';

type Role = 'ADMIN' | 'HR' | 'MANAGER';

export async function listUsers() {
  return prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    select: { id: true, email: true, name: true, role: true, isActive: true, createdAt: true },
  });
}

export async function getUserById(id: string) {
  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, email: true, name: true, role: true, isActive: true, createdAt: true },
  });
  if (!user) throw new Error('NOT_FOUND');
  return user;
}

export async function updateUserRole(id: string, role: Role) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new Error('NOT_FOUND');

  return prisma.user.update({
    where: { id },
    data: { role },
    select: { id: true, email: true, name: true, role: true, isActive: true },
  });
}

export async function updateUserEmail(id: string, email: string) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new Error('NOT_FOUND');

  // Check new email is not already taken by another user
  const existing = await prisma.user.findFirst({
    where: { email: email.toLowerCase(), id: { not: id } },
  });
  if (existing) throw new Error('EMAIL_TAKEN');

  return prisma.user.update({
    where: { id },
    data: { email: email.toLowerCase() },
    select: { id: true, email: true, name: true, role: true, isActive: true },
  });
}

/** Generates a random temporary password, hashes + stores it, and returns it in plaintext
 *  so an admin can share it with the user via another channel. */
export async function resetUserPassword(id: string): Promise<{ tempPassword: string }> {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new Error('NOT_FOUND');

  // Generate a readable 12-char temp password: letters + digits
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let tempPassword = '';
  for (let i = 0; i < 12; i++) {
    tempPassword += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  const passwordHash = await bcrypt.hash(tempPassword, 12);

  await prisma.user.update({
    where: { id },
    data: { passwordHash },
  });

  return { tempPassword };
}

export async function deactivateUser(id: string) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new Error('NOT_FOUND');

  return prisma.user.update({
    where: { id },
    data: { isActive: false },
    select: { id: true, email: true, name: true, role: true, isActive: true },
  });
}
