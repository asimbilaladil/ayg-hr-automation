import { z } from 'zod';

export const CreateAvailabilitySchema = z.object({
  location: z.string().min(1),
  managerName: z.string().min(1),
  managerEmail: z.string().email(),
  dayOfWeek: z.string().min(1),
  startTime: z.string().min(1),
  endTime: z.string().min(1),
  slotDuration: z.string().default('20 Min'),
  active: z.boolean().default(true),
});

export const UpdateAvailabilitySchema = z.object({
  location: z.string().optional(),
  managerName: z.string().optional(),
  managerEmail: z.string().email().optional(),
  dayOfWeek: z.string().optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  slotDuration: z.string().optional(),
  active: z.boolean().optional(),
});

export const SlotsQuerySchema = z.object({
  location: z.string().min(1),
  dayOfWeek: z.string().min(1),
  date: z.string().min(1), // YYYY-MM-DD
});

export const AvailabilityQuerySchema = z.object({
  location: z.string().optional(),
  dayOfWeek: z.string().optional(),
  managerEmail: z.string().optional(),
  active: z.coerce.boolean().optional(),
});

export type CreateAvailabilityInput = z.infer<typeof CreateAvailabilitySchema>;
export type UpdateAvailabilityInput = z.infer<typeof UpdateAvailabilitySchema>;
export type SlotsQuery = z.infer<typeof SlotsQuerySchema>;
export type AvailabilityQuery = z.infer<typeof AvailabilityQuerySchema>;
