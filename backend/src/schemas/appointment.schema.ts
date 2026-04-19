import { z } from 'zod';

export const CreateAppointmentSchema = z.object({
  candidateId:   z.string().min(1),          // Candidate.id (cuid)
  locationId:    z.string().min(1),          // Location.id  (cuid)
  interviewDate: z.string().min(1),          // YYYY-MM-DD
  interviewTime: z.string().min(1),          // 12-hour e.g. "9:00 AM"
  postingId:     z.string().optional(),      // Posting.id — accepted but stored on candidate
});

export const UpdateAppointmentSchema = z.object({
  location: z.string().optional(),
  managerName: z.string().optional(),
  managerEmail: z.string().email().optional(),
  candidateName: z.string().optional(),
  jobRole: z.string().optional(),
  interviewDate: z.string().optional(),
  day: z.string().optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  slotDuration: z.string().optional(),
  active: z.boolean().optional(),
});

export const AppointmentQuerySchema = z.object({
  location: z.string().optional(),
  date: z.string().optional(),
  managerEmail: z.string().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(10000).default(20),
});

export type CreateAppointmentInput = z.infer<typeof CreateAppointmentSchema>;
export type UpdateAppointmentInput = z.infer<typeof UpdateAppointmentSchema>;
export type AppointmentQuery = z.infer<typeof AppointmentQuerySchema>;
