import { z } from 'zod';

export const CreateAppointmentSchema = z.object({
  location: z.string().min(1),
  managerName: z.string().optional(),
  managerEmail: z.string().email().optional(),
  candidateName: z.string().min(1),
  jobRole: z.string().optional(),
  interviewDate: z.string().min(1), // ISO date string or YYYY-MM-DD
  day: z.string().optional(),
  startTime: z.string().min(1),
  endTime: z.string().optional(),
  slotDuration: z.string().default('20 min'),
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
  limit: z.coerce.number().min(1).max(200).default(20),
});

export type CreateAppointmentInput = z.infer<typeof CreateAppointmentSchema>;
export type UpdateAppointmentInput = z.infer<typeof UpdateAppointmentSchema>;
export type AppointmentQuery = z.infer<typeof AppointmentQuerySchema>;
