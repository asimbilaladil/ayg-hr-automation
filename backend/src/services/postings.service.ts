import { prisma } from '../lib/prisma';
import {
  CreatePostingInput,
  UpdatePostingInput,
} from '../schemas/posting.schema';

export async function listPostings() {
  return prisma.posting.findMany({
    orderBy: { name: 'asc' },
    include: {
      _count: {
        select: {
          candidates: true,
        },
      },
    },
  });
}

export async function getPostingById(id: string) {
  const posting = await prisma.posting.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          candidates: true,
        },
      },
    },
  });
  if (!posting) throw new Error('NOT_FOUND');
  return posting;
}

export async function createPosting(data: CreatePostingInput) {
  // Check if posting with this name already exists
  const existing = await prisma.posting.findFirst({
    where: {
      name: {
        equals: data.name,
        mode: 'insensitive',
      },
    },
  });

  if (existing) {
    throw new Error('DUPLICATE_POSTING');
  }

  return prisma.posting.create({
    data: {
      name: data.name,
      isActive: data.isActive ?? true,
    },
  });
}

export async function updatePosting(id: string, data: UpdatePostingInput) {
  const posting = await prisma.posting.findUnique({ where: { id } });
  if (!posting) throw new Error('NOT_FOUND');

  // If updating name, check for duplicates
  if (data.name) {
    const existing = await prisma.posting.findFirst({
      where: {
        name: {
          equals: data.name,
          mode: 'insensitive',
        },
        id: { not: id },
      },
    });

    if (existing) {
      throw new Error('DUPLICATE_POSTING');
    }
  }

  return prisma.posting.update({
    where: { id },
    data,
  });
}

export async function deletePosting(id: string) {
  const posting = await prisma.posting.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          candidates: true,
        },
      },
    },
  });

  if (!posting) throw new Error('NOT_FOUND');

  // Check if posting is being used
  if (posting._count.candidates > 0) {
    throw new Error('POSTING_IN_USE');
  }

  return prisma.posting.delete({
    where: { id },
  });
}

/**
 * Helper: Find or create posting by name
 * Returns postingId
 */
export async function findOrCreatePosting(postingName: string): Promise<string> {
  const trimmedName = postingName.trim();

  // Try to find existing posting (case-insensitive)
  let posting = await prisma.posting.findFirst({
    where: {
      name: {
        equals: trimmedName,
        mode: 'insensitive',
      },
    },
  });

  // If not found, create it
  if (!posting) {
    posting = await prisma.posting.create({
      data: {
        name: trimmedName,
        isActive: true,
      },
    });
  }

  return posting.id;
}
