import { prisma } from '../lib/prisma';
import { env } from '../config/env';
import fs from 'fs';
import path from 'path';
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

async function deleteFileSafe(filePath: string) {
  try {
    if (!filePath || !filePath.includes('.n8n')) {
      console.warn('⚠️ Unsafe or invalid path, skipping:', filePath);
      return;
    }

    await fs.promises.unlink(filePath);
    console.log('✅ CV deleted:', filePath);
  } catch (err: any) {
    if (err.code !== 'ENOENT') {
      console.error('❌ File delete error:', err.message);
    }
  }
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

    if (locationIds && locationIds.length > 0) {
      await prisma.location.updateMany({
        where: { id: { in: locationIds } },
        data: { managerId: manager.id },
      });
    }
  }

  return manager.id;
}

function flattenCandidate(candidate: any) {
  return {
    ...candidate,
    candidateName: candidate.name,
    postingName: candidate.posting_rel?.name || null,
    location: candidate.location_rel?.name || null,
    hiringManager: candidate.hiringManager_rel?.name || null,
    recruiter: candidate.recruiter_rel?.name || null,
    posting_rel: undefined,
    location_rel: undefined,
    hiringManager_rel: undefined,
    recruiter_rel: undefined,
  };
}

// (rest of file unchanged until deleteCandidate)

export async function deleteCandidate(id: string) {
  const candidate = await prisma.candidate.findUnique({ where: { id } });

  if (!candidate) throw new Error('NOT_FOUND');

  if (candidate.resumeUrl) {
    const filePath = path.resolve(candidate.resumeUrl);
    deleteFileSafe(filePath); // non-blocking
  }

  return prisma.candidate.delete({ where: { id } });
}

// rest of file continues unchanged...
