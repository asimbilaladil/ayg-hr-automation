import { prisma } from '../lib/prisma';
import {
  CreateCandidateInput,
  UpdateAIReviewInput,
  UpdateCallResultInput,
  UpdateCandidateInput,
  CandidateQuery,
} from '../schemas/candidate.schema';
import { findOrCreatePosting } from './postings.service';

/**
 * Helper: Find or create location by name
 * Returns locationId
 */
async function findOrCreateLocation(locationName: string): Promise<string> {
  const trimmedName = locationName.trim();

  let location = await prisma.location.findFirst({
    where: {
      name: {
        equals: trimmedName,
        mode: 'insensitive',
      },
    },
  });

  if (!location) {
    location = await prisma.location.create({
      data: {
        name: trimmedName,
        isActive: true,
      },
    });
  }

  return location.id;
}

/**
 * Helper: Find or create hiring manager by name
 * Returns userId or null
 */
async function findOrCreateManager(managerName: string): Promise<string | null> {
  if (!managerName) return null;

  const trimmedName = managerName.trim();

  let manager = await prisma.user.findFirst({
    where: {
      name: {
        equals: trimmedName,
        mode: 'insensitive',
      },
      role: 'MANAGER',
    },
  });

  if (!manager) {
    const tempEmail = `${trimmedName.toLowerCase().replace(/\s+/g, '.')}@temp.placeholder`;

    const existingEmail = await prisma.user.findUnique({
      where: { email: tempEmail },
    });

    if (existingEmail) {
      return existingEmail.id;
    }

    manager = await prisma.user.create({
      data: {
        name: trimmedName,
        email: tempEmail,
        role: 'MANAGER',
        passwordHash: null,
        isActive: true,
      },
    });
  }

  return manager.id;
}

export async function listCandidates(query: CandidateQuery) {
  const { status, location, postingName, aiRecommendation, search, page, limit, sortBy, sortOrder } = query;

  const where: Record<string, any> = { deletedAt: null };

  if (status) where.status = status;

  // Handle location filter - could be ID or name
  if (location) {
    const locationRecord = await prisma.location.findFirst({
      where: {
        OR: [
          { id: location },
          { name: { contains: location, mode: 'insensitive' } },
        ],
      },
    });
    if (locationRecord) {
      where.locationId = locationRecord.id;
    }
  }

  // Handle posting filter - could be ID or name
  if (postingName) {
    const postingRecord = await prisma.posting.findFirst({
      where: {
        OR: [
          { id: postingName },
          { name: { contains: postingName, mode: 'insensitive' } },
        ],
      },
    });
    if (postingRecord) {
      where.postingId = postingRecord.id;
    }
  }

  if (aiRecommendation) where.aiRecommendation = aiRecommendation;
  if (search) where.candidateName = { contains: search, mode: 'insensitive' };

  const [data, total] = await Promise.all([
    prisma.candidate.findMany({
      where,
      include: {
        posting: true,
        location: true,
        hiringManager: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
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
  const candidate = await prisma.candidate.findFirst({
    where: { id, deletedAt: null },
    include: {
      posting: true,
      location: true,
      hiringManager: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
    },
  });
  if (!candidate) throw new Error('NOT_FOUND');
  return candidate;
}

export async function getCandidateByEmailId(emailId: string) {
  const candidate = await prisma.candidate.findFirst({
    where: { emailId, deletedAt: null },
    include: {
      posting: true,
      location: true,
      hiringManager: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
    },
  });
  if (!candidate) throw new Error('NOT_FOUND');
  return candidate;
}

export async function createCandidate(data: CreateCandidateInput) {
  // Resolve posting name to ID (find or create)
  const postingId = await findOrCreatePosting(data.postingName);

  // Resolve location name to ID (find or create)
  const locationId = await findOrCreateLocation(data.location);

  // Resolve hiring manager name to ID (find or create)
  const hiringManagerId = data.hiringManager
    ? await findOrCreateManager(data.hiringManager)
    : null;

  return prisma.candidate.create({
    data: {
      candidateName: data.candidateName,
      phone: data.phone,
      dateApplied: data.dateApplied,
      status: data.status,
      receivedAt: data.receivedAt ? new Date(data.receivedAt) : undefined,
      emailId: data.emailId,
      postingId,
      locationId,
      hiringManagerId,
      // Backward compatibility - store text values too
      postingName: data.postingName,
      location_text: data.location,
      hiringManager_text: data.hiringManager,
    },
    include: {
      posting: true,
      location: true,
      hiringManager: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
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
    include: {
      posting: true,
      location: true,
      hiringManager: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
    },
  });
}

export async function updateCallResult(emailId: string, data: UpdateCallResultInput) {
  const candidate = await prisma.candidate.findUnique({ where: { emailId } });
  if (!candidate) throw new Error('NOT_FOUND');

  return prisma.candidate.update({
    where: { emailId },
    data,
    include: {
      posting: true,
      location: true,
      hiringManager: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
    },
  });
}

export async function updateCandidate(id: string, data: UpdateCandidateInput) {
  const candidate = await prisma.candidate.findFirst({ where: { id, deletedAt: null } });
  if (!candidate) throw new Error('NOT_FOUND');

  const updateData: any = {
    ...(data.candidateName && { candidateName: data.candidateName }),
    ...(data.phone !== undefined && { phone: data.phone }),
    ...(data.dateApplied !== undefined && { dateApplied: data.dateApplied }),
    ...(data.status && { status: data.status }),
  };

  // Resolve posting if provided
  if (data.postingName) {
    const postingId = await findOrCreatePosting(data.postingName);
    updateData.postingId = postingId;
    updateData.postingName = data.postingName; // Backward compatibility
  }

  // Resolve location if provided
  if (data.location) {
    const locationId = await findOrCreateLocation(data.location);
    updateData.locationId = locationId;
    updateData.location_text = data.location; // Backward compatibility
  }

  // Resolve hiring manager if provided
  if (data.hiringManager) {
    const hiringManagerId = await findOrCreateManager(data.hiringManager);
    updateData.hiringManagerId = hiringManagerId;
    updateData.hiringManager_text = data.hiringManager; // Backward compatibility
  }

  return prisma.candidate.update({
    where: { id },
    data: updateData,
    include: {
      posting: true,
      location: true,
      hiringManager: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
    },
  });
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
  const result = await prisma.candidate.updateMany({
    where: {
      deletedAt: null,
      status: { in: ['not_found'] },
    },
    data: { status: 'pending' },
  });

  return { reset: result.count };
}

export async function updateCandidateStatus(
  emailId: string,
  data: { status: string; resumeUrl?: string }
) {
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
    include: {
      posting: true,
      location: true,
      hiringManager: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
    },
  });
}
