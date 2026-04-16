import { prisma } from '../lib/prisma';
import {
  CreateCandidateInput,
  UpdateCandidateInput,
  CandidateQuery,
} from '../schemas/candidate.schema';
import { findOrCreatePosting } from './postings.service';

async function findOrCreateLocation(locationName: string): Promise<string> {
  const trimmedName = locationName.trim();

  let location = await prisma.location.findFirst({
    where: {
      name: { equals: trimmedName, mode: 'insensitive' },
    },
  });

  if (!location) {
    location = await prisma.location.create({
      data: { name: trimmedName, isActive: true },
    });
  }

  return location.id;
}

async function findOrCreateManager(managerName: string): Promise<string | null> {
  if (!managerName) return null;

  const trimmedName = managerName.trim();

  let manager = await prisma.user.findFirst({
    where: {
      name: { equals: trimmedName, mode: 'insensitive' },
    },
  });

  if (!manager) {
    const tempEmail = `${trimmedName.toLowerCase().replace(/\s+/g, '.')}@temp.placeholder`;

    manager = await prisma.user.create({
      data: {
        name: trimmedName,
        email: tempEmail,
      },
    });
  }

  return manager.id;
}

export async function listCandidates(query: CandidateQuery) {
  const { location, postingName, search, page, limit, sortBy, sortOrder } = query;

  const where: Record<string, any> = {};

  if (location) {
    const locationRecord = await prisma.location.findFirst({
      where: {
        OR: [
          { id: location },
          { name: { contains: location, mode: 'insensitive' } },
        ],
      },
    });
    if (locationRecord) where.locationId = locationRecord.id;
  }

  if (postingName) {
    const postingRecord = await prisma.posting.findFirst({
      where: {
        OR: [
          { id: postingName },
          { name: { contains: postingName, mode: 'insensitive' } },
        ],
      },
    });
    if (postingRecord) where.postingId = postingRecord.id;
  }

  if (search) where.name = { contains: search, mode: 'insensitive' };

  const [data, total] = await Promise.all([
    prisma.candidate.findMany({
      where,
      include: {
        posting_rel: true,
        location_rel: true,
        hiringManager_rel: true,
      },
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.candidate.count({ where }),
  ]);

  return { data, total, page, limit };
}

export async function getCandidateById(id: string) {
  const candidate = await prisma.candidate.findUnique({
    where: { id },
    include: {
      posting_rel: true,
      location_rel: true,
      hiringManager_rel: true,
    },
  });

  if (!candidate) throw new Error('NOT_FOUND');
  return candidate;
}

export async function getCandidateByEmailId(emailId: string) {
  const candidate = await prisma.candidate.findUnique({
    where: { emailId },
    include: {
      posting_rel: true,
      location_rel: true,
      hiringManager_rel: true,
    },
  });

  if (!candidate) throw new Error('NOT_FOUND');
  return candidate;
}

export async function createCandidate(data: CreateCandidateInput) {
  const postingId = await findOrCreatePosting(data.postingName);
  const locationId = await findOrCreateLocation(data.location);
  const hiringManagerId = data.hiringManager
    ? await findOrCreateManager(data.hiringManager)
    : null;

  return prisma.candidate.create({
    data: {
      name: data.candidateName,
      phone: data.phone,
      dateApplied: data.dateApplied,
      status: data.status,
      emailId: data.emailId,
      postingId,
      locationId,
      hiringManagerId,
    },
    include: {
      posting_rel: true,
      location_rel: true,
      hiringManager_rel: true,
    },
  });
}

export async function updateCandidate(id: string, data: UpdateCandidateInput) {
  const candidate = await prisma.candidate.findUnique({ where: { id } });
  if (!candidate) throw new Error('NOT_FOUND');

  const updateData: any = {
    ...(data.candidateName && { name: data.candidateName }),
    ...(data.phone !== undefined && { phone: data.phone }),
    ...(data.dateApplied !== undefined && { dateApplied: data.dateApplied }),
    ...(data.status && { status: data.status }),
  };

  if (data.postingName) {
    updateData.postingId = await findOrCreatePosting(data.postingName);
  }

  if (data.location) {
    updateData.locationId = await findOrCreateLocation(data.location);
  }

  if (data.hiringManager) {
    updateData.hiringManagerId = await findOrCreateManager(data.hiringManager);
  }

  return prisma.candidate.update({
    where: { id },
    data: updateData,
    include: {
      posting_rel: true,
      location_rel: true,
      hiringManager_rel: true,
    },
  });
}

export async function deleteCandidate(id: string) {
  return prisma.candidate.delete({ where: { id } });
}

// ✅ BACKWARD COMPATIBILITY METHODS
export const updateCandidateStatus = updateCandidate;

export async function updateAIReview(emailId: string, data: any) {
  return prisma.candidate.update({
    where: { emailId },
    data: {
      status: data.status || 'reviewed'
    }
  });
}

export async function updateCallResult(emailId: string, data: any) {
  return prisma.candidate.update({
    where: { emailId },
    data: {
      status: data.status || 'called'
    }
  });
}

export async function resetProblematicCandidates() {
  return prisma.candidate.updateMany({
    where: {
      status: 'problematic'
    },
    data: {
      status: 'pending'
    }
  });
}
