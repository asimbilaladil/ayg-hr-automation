import { prisma } from '../lib/prisma';

export async function getSyncCursor(key: string) {
  const cursor = await prisma.syncCursor.findUnique({ where: { key } });
  return { key, value: cursor?.value ?? null };
}

export async function setSyncCursor(key: string, value: string) {
  const cursor = await prisma.syncCursor.upsert({
    where: { key },
    create: { key, value },
    update: { value },
  });
  return cursor;
}
