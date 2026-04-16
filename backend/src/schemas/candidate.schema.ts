import { z } from 'zod';

export const CreateCandidateSchema = z.object({
  postingName: z.string().min(1),
  location: z.string().min(1), // This will be the location name from n8n
  candidateName: z.string().min(1),
  phone: z.string().optional(),
  dateApplied: z.string().optional(),
  hiringManager: z.string().optional(), // This will be the manager name from n8n
  recruiter: z.string().optional(), // This will be the recruiter name from n8n
  status: z.string().default('pending'),
  receivedAt: z.string().datetime().optional(),
  emailId: z.string().min(1),
});

export const UpdateAIReviewSchema = z.object({
  aiScore: z.number().min(0).max(100).optional(),
  aiRecommendation: z.enum(['HIRE', 'MAYBE', 'REJECT']).optional(),
  aiCriteriaMet: z.string().optional(),
  aiCriteriaMissing: z.string().optional(),
  aiSummary: z.string().optional(),
  status: z.string().optional(),
  reviewedAt: z.string().datetime().optional(),
  candidateName: z.string().optional(),
  phone: z.string().optional(),
});

export const UpdateCallResultSchema = z.object({
  transcript: z.string().optional(),
  called: z.string().optional(),
  status: z.string().optional(),
});

export const UpdateCandidateSchema = z.object({
  postingName: z.string().optional(),
  location: z.string().optional(), // Location name (will be resolved to ID)
  candidateName: z.string().optional(),
  phone: z.string().optional(),
  dateApplied: z.string().optional(),
  hiringManager: z.string().optional(), // Manager name (will be resolved to ID)
  recruiter: z.string().optional(), // Recruiter name (will be resolved to ID)
  status: z.string().optional(),
});

export const CandidateQuerySchema = z.object({
  status: z.string().optional(),
  location: z.string().optional(), // Can be location name or ID
  postingName: z.string().optional(),
  aiRecommendation: z.enum(['HIRE', 'MAYBE', 'REJECT']).optional(),
  search: z.string().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(9999).default(20),
  sortBy: z.enum(['createdAt', 'aiScore', 'candidateName']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// New schemas for Location and Manager
export const CreateLocationSchema = z.object({
  name: z.string().min(1),
  isActive: z.boolean().default(true),
});

export const UpdateLocationSchema = z.object({
  name: z.string().min(1).optional(),
  isActive: z.boolean().optional(),
});

export const CreateManagerSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  role: z.enum(['ADMIN', 'MANAGER', 'HR']).default('MANAGER'),
});

export type CreateCandidateInput = z.infer<typeof CreateCandidateSchema>;
export type UpdateAIReviewInput = z.infer<typeof UpdateAIReviewSchema>;
export type UpdateCallResultInput = z.infer<typeof UpdateCallResultSchema>;
export type UpdateCandidateInput = z.infer<typeof UpdateCandidateSchema>;
export type CandidateQuery = z.infer<typeof CandidateQuerySchema>;
export type CreateLocationInput = z.infer<typeof CreateLocationSchema>;
export type UpdateLocationInput = z.infer<typeof UpdateLocationSchema>;
export type CreateManagerInput = z.infer<typeof CreateManagerSchema>;
