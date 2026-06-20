import { z } from 'zod';

export const CreateCandidateSchema = z.object({
  postingName: z.string().min(1),
  location: z.string().min(1),
  candidateName: z.string().min(1),
  phone: z.string().optional(),
  dateApplied: z.string().optional(),
  hiringManager: z.string().optional(),
  status: z.string().default('pending'),
  receivedAt: z.string().datetime().optional(),
  emailId: z.string().min(1),
  resumeUrl: z.string().optional(),
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
  transcript:       z.string().optional(),
  recordingUrl:     z.string().url().optional(),
  called:           z.string().optional(),
  status:           z.string().optional(),
  interviewAnswers: z.string().optional(),  // JSON string: [{question, category, answer}]
  nextCallAt:       z.string().datetime().optional(),  // ISO — when cooldown expires; auto-set on voicemail
  endedReason:      z.string().optional(),             // VAPI ended-reason: voicemail, hangup, etc.
});

export const UpdateCandidateSchema = z.object({
  postingName: z.string().optional(),
  location: z.string().optional(),
  candidateName: z.string().optional(),
  phone: z.string().optional(),
  dateApplied: z.string().optional(),
  hiringManager: z.string().optional(),
  status: z.string().optional(),
  resumeUrl: z.string().optional(), // ✅ optional in update
});

export const CandidateQuerySchema = z.object({
  status: z.string().optional(),
  // Accept ?location=X, repeated ?location=X&location=Y, or comma-separated ?location=X,Y
  location: z.union([z.string(), z.array(z.string())])
    .optional()
    .transform(v => {
      if (v === undefined) return undefined;
      const arr = Array.isArray(v) ? v : [v];
      return arr.flatMap(s => s.split(',').map(l => l.trim()).filter(Boolean));
    }),
  postingName: z.string().optional(),
  hiringManager: z.string().optional(),
  aiRecommendation: z.enum(['HIRE', 'MAYBE', 'REJECT']).optional(),
  search: z.string().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(9999).default(20),
  sortBy: z.enum(['createdAt', 'aiScore', 'candidateName']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  // Return only candidates where nextCallAt IS NULL or nextCallAt <= value
  nextCallAtBefore: z.string().datetime().optional(),
});

export type CreateCandidateInput = z.infer<typeof CreateCandidateSchema>;
export type UpdateAIReviewInput = z.infer<typeof UpdateAIReviewSchema>;
export type UpdateCallResultInput = z.infer<typeof UpdateCallResultSchema>;
export type UpdateCandidateInput = z.infer<typeof UpdateCandidateSchema>;
export type CandidateQuery = z.infer<typeof CandidateQuerySchema>;
