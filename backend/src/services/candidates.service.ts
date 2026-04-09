import { prisma } from '../lib/prisma';
import {
  CreateCandidateInput,
  UpdateAIReviewInput,
  UpdateCallResultInput,
  UpdateCandidateInput,
  CandidateQuery,
} from '../schemas/candidate.schema';

export async function listCandidates(query: CandidateQuery) {
  const { status, location, postingName, aiRecommendation, search, page, limit, sortBy, sortOrder } = query;

  const where: Record<string, unknown> = { deletedAt: null };

  if (status) where.status = status;
  if (location) where.location = { contains: location, mode: 'insensitive' };
  if (postingName) where.postingName = { contains: postingName, mode: 'insensitive' };
  if (aiRecommendation) where.aiRecommendation = aiRecommendation;
  if (search) where.candidateName = { contains: search, mode: 'insensitive' };

  const [data, total] = await Promise.all([
    prisma.candidate.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.candidate.count({ where }),
  ]);

  return { data, total, page, limit };
}

export async function getCandidateById(id: string) {
  const candidate = await prisma.candidate.findFirst({
    where: { id, deletedAt: null },
  });
  if (!candidate) throw new Error('NOT_FOUND');
  return candidate;
}

export async function getCandidateByEmailId(emailId: string) {
  const candidate = await prisma.candidate.findFirst({
    where: { emailId, deletedAt: null },
  });
  if (!candidate) throw new Error('NOT_FOUND');
  return candidate;
}

export async function createCandidate(data: CreateCandidateInput) {
  return prisma.candidate.create({
    data: {
      ...data,
      receivedAt: data.receivedAt ? new Date(data.receivedAt) : undefined,
    },
  });
}

export async function updateAIReview(emailId: string, data: UpdateAIReviewInput) {
  const candidate = await prisma.candidate.findUnique({ where: { emailId } });
  if (!candidate) throw new Error('NOT_FOUND');

  return prisma.candidate.update({
    where: { emailId },
    data: {
      ...data,
      reviewedAt: data.reviewedAt ? new Date(data.reviewedAt) : undefined,
    },
  });
}

export async function updateCallResult(emailId: string, data: UpdateCallResultInput) {
  const candidate = await prisma.candidate.findUnique({ where: { emailId } });
  if (!candidate) throw new Error('NOT_FOUND');

  return prisma.candidate.update({
    where: { emailId },
    data,
  });
}

export async function updateCandidate(id: string, data: UpdateCandidateInput) {
  const candidate = await prisma.candidate.findFirst({ where: { id, deletedAt: null } });
  if (!candidate) throw new Error('NOT_FOUND');

  return prisma.candidate.update({ where: { id }, data });
}

export async function deleteCandidate(id: string) {
  const candidate = await prisma.candidate.findFirst({ where: { id, deletedAt: null } });
  if (!candidate) throw new Error('NOT_FOUND');

  return prisma.candidate.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
}

export async function resetProblematicCandidates() {
  // Reset candidates stuck in non-terminal states for more than 24h
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const result = await prisma.candidate.updateMany({
    where: {
      deletedAt: null,
      status: { in: ['reviewed'] },
      updatedAt: { lt: cutoff },
    },
    data: { status: 'pending' },
  });

  return { reset: result.count };
}

export async function updateCandidateStatus(emailId: string, data: { status: string; resumeUrl?: string }) {
  const cleanEmailId = emailId.trim();

  const candidate = await prisma.candidate.findUnique({
    where: { emailId: cleanEmailId },
  });

  if (!candidate) throw new Error('NOT_FOUND');

  return prisma.candidate.update({
    where: { emailId: cleanEmailId },
    data: {
      status: data.status,
      ...(data.resumeUrl && { resumeUrl: data.resumeUrl }),
    },
  });
}
