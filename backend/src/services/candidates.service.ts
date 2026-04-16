import { prisma } from '../lib/prisma';
import {
  CreateCandidateInput,
  UpdateAIReviewInput,
  UpdateCallResultInput,
  UpdateCandidateInput,
  CandidateQuery,
} from '../schemas/candidate.schema';

/**
 * Helper: Find or create location by name
 * Returns locationId or null
 */
async function findOrCreateLocation(locationName: string): Promise<string | null> {
  if (!locationName) return null;

  const trimmedName = locationName.trim();

  // Try to find existing location (case-insensitive)
  let location = await prisma.location.findFirst({
    where: {
      name: {
        equals: trimmedName,
        mode: 'insensitive',
      },
    },
  });

  // If not found, create it
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
 * Helper: Find or create user/manager by name
 * Creates placeholder user if not found (admin can update email/password later)
 * Returns userId or null
 */
async function findOrCreateManager(
  managerName: string,
  role: 'MANAGER' | 'HR' = 'MANAGER'
): Promise<string | null> {
  if (!managerName) return null;

  const trimmedName = managerName.trim();

  // Try to find existing user by name (case-insensitive)
  let manager = await prisma.user.findFirst({
    where: {
      name: {
        equals: trimmedName,
        mode: 'insensitive',
      },
      role: role,
    },
  });

  // If not found, create placeholder user
  if (!manager) {
    // Generate temporary email
    const tempEmail = `${trimmedName.toLowerCase().replace(/\s+/g, '.')}@temp.placeholder`;

    // Check if email already exists
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
        role: role,
        passwordHash: null, // Admin will set password later
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

  if (postingName) where.postingName = { contains: postingName, mode: 'insensitive' };
  if (aiRecommendation) where.aiRecommendation = aiRecommendation;
  if (search) where.candidateName = { contains: search, mode: 'insensitive' };

  const [data, total] = await Promise.all([
    prisma.candidate.findMany({
      where,
      include: {
        location_rel: true,
        hiringManager_rel: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        recruiter_rel: {
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
      location_rel: true,
      hiringManager_rel: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
      recruiter_rel: {
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
      location_rel: true,
      hiringManager_rel: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
      recruiter_rel: {
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
  // Resolve location name to ID (find or create)
  const locationId = await findOrCreateLocation(data.location);

  // Resolve hiring manager name to ID (find or create)
  const hiringManagerId = data.hiringManager
    ? await findOrCreateManager(data.hiringManager, 'MANAGER')
    : null;

  // Resolve recruiter name to ID (find or create)
  const recruiterId = data.recruiter
    ? await findOrCreateManager(data.recruiter, 'HR')
    : null;

  return prisma.candidate.create({
    data: {
      postingName: data.postingName,
      candidateName: data.candidateName,
      phone: data.phone,
      dateApplied: data.dateApplied,
      status: data.status,
      receivedAt: data.receivedAt ? new Date(data.receivedAt) : undefined,
      emailId: data.emailId,
      location: data.location,
      locationId,
      hiringManagerId,
      recruiterId,
    },
    include: {
      location_rel: true,
      hiringManager_rel: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
      recruiter_rel: {
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
      location_rel: true,
      hiringManager_rel: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
      recruiter_rel: {
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
      location_rel: true,
      hiringManager_rel: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
      recruiter_rel: {
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

  // Resolve location if provided
  const locationId = data.location
    ? await findOrCreateLocation(data.location)
    : undefined;

  // Resolve hiring manager if provided
  const hiringManagerId = data.hiringManager
    ? await findOrCreateManager(data.hiringManager, 'MANAGER')
    : undefined;

  // Resolve recruiter if provided
  const recruiterId = data.recruiter
    ? await findOrCreateManager(data.recruiter, 'HR')
    : undefined;

  // Build update data object
  const updateData: any = {
    ...(data.postingName && { postingName: data.postingName }),
    ...(data.candidateName && { candidateName: data.candidateName }),
    ...(data.phone !== undefined && { phone: data.phone }),
    ...(data.dateApplied !== undefined && { dateApplied: data.dateApplied }),
    ...(data.status && { status: data.status }),
    ...(locationId !== undefined && { locationId }),
    ...(hiringManagerId !== undefined && { hiringManagerId }),
    ...(recruiterId !== undefined && { recruiterId }),
  };

  return prisma.candidate.update({
    where: { id },
    data: updateData,
    include: {
      location_rel: true,
      hiringManager_rel: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
      recruiter_rel: {
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
      location_rel: true,
      hiringManager_rel: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
      recruiter_rel: {
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
