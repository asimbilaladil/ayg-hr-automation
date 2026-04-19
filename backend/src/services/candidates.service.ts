import { prisma } from '../lib/prisma';
import { env } from '../config/env';
import {
  CreateCandidateInput,
  UpdateCandidateInput,
  CandidateQuery,
} from '../schemas/candidate.schema';
import { findOrCreatePosting } from './postings.service';

/** Title-cases a name: "john DOE" → "John Doe" */
function toTitleCase(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

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

async function findOrCreateManager(managerName: string, locationIds?: string[]): Promise<string | null> {
  if (!managerName) return null;

  const trimmedName = managerName.trim();

  let manager = await prisma.user.findFirst({
    where: {
      name: { equals: trimmedName, mode: 'insensitive' },
    },
  });

  if (!manager) {
    const tempEmail = `${trimmedName.toLowerCase().replace(/\s+/g, '.')}@${env.ORG_EMAIL_DOMAIN}`;

    manager = await prisma.user.create({
      data: {
        name: trimmedName,
        email: tempEmail,
        role: 'MANAGER'
      },
    });

    // If locationIds provided, assign manager to those locations
    if (locationIds && locationIds.length > 0) {
      await prisma.location.updateMany({
        where: { id: { in: locationIds } },
        data: { managerId: manager.id },
      });
    }
  }

  return manager.id;
}

// Helper function to flatten candidate response
function flattenCandidate(candidate: any) {
  return {
    ...candidate,
    candidateName: candidate.name,
    postingName: candidate.posting_rel?.name || null,
    location: candidate.location_rel?.name || null,
    hiringManager: candidate.hiringManager_rel?.name || null,
    recruiter: candidate.recruiter_rel?.name || null,
    // Remove the nested objects
    posting_rel: undefined,
    location_rel: undefined,
    hiringManager_rel: undefined,
    recruiter_rel: undefined,
  };
}

export async function listCandidates(
  query: CandidateQuery & { hiringManager?: string },
  scopedManagerId?: string,   // when set, restrict to this manager's candidates
) {
  const { location, postingName, hiringManager, search, page, limit, sortBy, sortOrder } = query;
  const aiRecommendation = (query as any).aiRecommendation;
  const status = (query as any).status;

  const where: Record<string, any> = {};

  // Manager-scoped: only show candidates assigned to this manager
  if (scopedManagerId) {
    where.hiringManagerId = scopedManagerId;
  }

  if (status) where.status = status;

  if (aiRecommendation) where.aiRecommendation = aiRecommendation;

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
    else where.locationId = null; // no match → return empty
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
    else where.postingId = null;
  }

  if (hiringManager) {
    where.hiringManager_rel = {
      name: { contains: hiringManager, mode: 'insensitive' },
    };
  }

  if (search) {
    where.OR = [
      { name:  { contains: search, mode: 'insensitive' } },
      { phone: { contains: search, mode: 'insensitive' } },
    ];
  }

  // Map frontend sortBy keys to actual Prisma field names
  const sortFieldMap: Record<string, string> = {
    candidateName: 'name',
    aiScore:       'aiScore',
    createdAt:     'createdAt',
  };
  const orderField = sortFieldMap[sortBy] || 'createdAt';

  const [data, total] = await Promise.all([
    prisma.candidate.findMany({
      where,
      include: {
        posting_rel: true,
        location_rel: true,
        hiringManager_rel: true,
        recruiter_rel: true,
        appointment: true,
      },
      orderBy: { [orderField]: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.candidate.count({ where }),
  ]);

  return { data: data.map(flattenCandidate), total, page, limit };
}

export async function getCandidateById(id: string) {
  const candidate = await prisma.candidate.findUnique({
    where: { id },
    include: {
      posting_rel: true,
      location_rel: true,
      hiringManager_rel: true,
      recruiter_rel: true,
      appointment: true,
    },
  });

  if (!candidate) throw new Error('NOT_FOUND');
  return flattenCandidate(candidate);
}

export async function getCandidateByEmailId(emailId: string) {
  const candidate = await prisma.candidate.findUnique({
    where: { emailId },
    include: {
      posting_rel: true,
      location_rel: true,
      hiringManager_rel: true,
      recruiter_rel: true,
      appointment: true,
    },
  });

  if (!candidate) throw new Error('NOT_FOUND');
  return flattenCandidate(candidate);
}

export async function createCandidate(data: CreateCandidateInput) {
  const postingId = await findOrCreatePosting(data.postingName);
  const locationId = await findOrCreateLocation(data.location);
  // Pass locationId so new managers are auto-assigned to this location
  const hiringManagerId = data.hiringManager
    ? await findOrCreateManager(data.hiringManager, [locationId])
    : null;

  const candidate = await prisma.candidate.create({
    data: {
      name: toTitleCase(data.candidateName),
      phone: data.phone,
      dateApplied: data.dateApplied,
      status: data.status,
      emailId: data.emailId,
      resumeUrl: data.resumeUrl, // ✅ ADDED
      postingId,
      locationId,
      hiringManagerId,
    },
    include: {
      posting_rel: true,
      location_rel: true,
      hiringManager_rel: true,
      recruiter_rel: true,
      appointment: true,
    },
  });

  return flattenCandidate(candidate);
}

export async function updateCandidate(id: string, data: UpdateCandidateInput) {
  const candidate = await prisma.candidate.findUnique({ where: { id } });
  if (!candidate) throw new Error('NOT_FOUND');

  const updateData: any = {
    ...(data.candidateName && { name: toTitleCase(data.candidateName) }),
    ...(data.phone !== undefined && { phone: data.phone }),
    ...(data.dateApplied !== undefined && { dateApplied: data.dateApplied }),
    ...(data.status && { status: data.status }),
    ...(data.resumeUrl && { resumeUrl: data.resumeUrl }), // ✅ ADDED
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

  const updated = await prisma.candidate.update({
    where: { id },
    data: updateData,
    include: {
      posting_rel: true,
      location_rel: true,
      hiringManager_rel: true,
      recruiter_rel: true,
      appointment: true,
    },
  });

  return flattenCandidate(updated);
}

export async function deleteCandidate(id: string) {
  return prisma.candidate.delete({ where: { id } });
}

export async function updateCandidateStatus(emailId: string, data: any) {
  const updated = await prisma.candidate.update({
    where: { emailId },
    data: {
      status: data.status,
    },
    include: {
      posting_rel: true,
      location_rel: true,
      hiringManager_rel: true,
      recruiter_rel: true,
      appointment: true,
    }
  });
  return flattenCandidate(updated);
}

export async function getResume(emailId: string, res: any) {
  const fs = require('fs').promises;
  const fssync = require('fs');
  const path = require('path');

  // Find the candidate
  const candidate = await prisma.candidate.findUnique({ where: { emailId } });
  if (!candidate) {
    return res.status(404).json({ error: 'Candidate not found' });
  }

  const RESUMES_DIR = '/root/.n8n-files/resumes';

  async function sendFile(filePath: string) {
    const fileContent = await fs.readFile(filePath);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${path.basename(filePath)}"`);
    res.send(fileContent);
  }

  // Strategy 1: use stored resumeUrl field from the database
  if (candidate.resumeUrl) {
    const storedUrl = candidate.resumeUrl.trim();
    // Local absolute path stored directly
    if (storedUrl.startsWith('/')) {
      try {
        await fs.access(storedUrl);
        return sendFile(storedUrl);
      } catch { /* fall through */ }
    }
    // Path relative to RESUMES_DIR
    const relPath = path.join(RESUMES_DIR, path.basename(storedUrl));
    try {
      await fs.access(relPath);
      return sendFile(relPath);
    } catch { /* fall through */ }
    // External URL — redirect the browser directly
    if (storedUrl.startsWith('http')) {
      return res.redirect(storedUrl);
    }
  }

  // Strategy 2: constructed filename (original logic)
  const constructedName = `${candidate.name.replace(/ /g, '_')}_${emailId}_Resume.pdf`;
  const constructedPath = path.join(RESUMES_DIR, constructedName);
  try {
    await fs.access(constructedPath);
    return sendFile(constructedPath);
  } catch { /* fall through */ }

  // Strategy 3: scan directory for any file that contains the emailId
  try {
    const files = await fs.readdir(RESUMES_DIR);
    const match = files.find((f: string) => f.includes(emailId));
    if (match) {
      return sendFile(path.join(RESUMES_DIR, match));
    }
  } catch (err) {
    console.error('Could not scan resumes directory:', err);
  }

  console.error(`Resume not found for emailId=${emailId}. resumeUrl=${candidate.resumeUrl}`);
  res.status(404).json({ error: 'Resume file not found' });
}

export async function updateAIReview(emailId: string, data: any) {
  const updated = await prisma.candidate.update({
    where: { emailId },
    data: {
      status:            data.status            || 'reviewed',
      ...(data.aiScore != null && data.aiScore > 0 && { aiScore: data.aiScore }),
      ...(data.aiRecommendation  != null && { aiRecommendation:  data.aiRecommendation }),
      ...(data.aiCriteriaMet     != null && { aiCriteriaMet:     data.aiCriteriaMet }),
      ...(data.aiCriteriaMissing != null && { aiCriteriaMissing: data.aiCriteriaMissing }),
      ...(data.aiSummary         != null && { aiSummary:         data.aiSummary }),
      // n8n sometimes sends candidateName / phone updates alongside AI review
      ...(data.candidateName     != null && { name: toTitleCase(data.candidateName) }),
      ...(data.phone             != null && { phone: data.phone }),
    },
    include: {
      posting_rel: true,
      location_rel: true,
      hiringManager_rel: true,
      recruiter_rel: true,
      appointment: true,
    }
  });
  return flattenCandidate(updated);
}

export async function updateCallResult(emailId: string, data: any) {
  const updated = await prisma.candidate.update({
    where: { emailId },
    data: {
      status:     data.status     || 'called',
      ...(data.transcript   != null && { transcript:   data.transcript }),
      ...(data.recordingUrl != null && { recordingUrl: data.recordingUrl }),
    },
    include: {
      posting_rel: true,
      location_rel: true,
      hiringManager_rel: true,
      recruiter_rel: true,
      appointment: true,
    }
  });
  return flattenCandidate(updated);
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
