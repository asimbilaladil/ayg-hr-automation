import { prisma } from '../lib/prisma';

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

export async function updateUserRole(id: string, role: string) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new Error('NOT_FOUND');

  return prisma.user.update({
    where: { id },
    data: { role },
    select: { id: true, email: true, name: true, role: true, isActive: true },
  });
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
