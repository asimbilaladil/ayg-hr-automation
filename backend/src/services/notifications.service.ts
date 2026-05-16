import { prisma } from '../lib/prisma';

export async function createNotification(
  userId: string,
  title: string,
  body: string,
  metadata?: Record<string, any>,
) {
  return prisma.notification.create({
    data: {
      userId,
      title,
      body,
      metadata: metadata ? JSON.stringify(metadata) : undefined,
    },
  });
}

export async function listNotifications(userId: string) {
  const notifications = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  const unreadCount = await prisma.notification.count({ where: { userId, read: false } });
  return { notifications, unreadCount };
}

export async function markAllRead(userId: string) {
  await prisma.notification.updateMany({ where: { userId, read: false }, data: { read: true } });
}

export async function markOneRead(id: string, userId: string) {
  await prisma.notification.updateMany({ where: { id, userId }, data: { read: true } });
}
