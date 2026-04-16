import { z } from 'zod';

export const CreateLocationSchema = z.object({
  name: z.string().min(1, 'Location name is required'),
  isActive: z.boolean().default(true),
});

export const UpdateLocationSchema = z.object({
  name: z.string().min(1, 'Location name is required').optional(),
  isActive: z.boolean().optional(),
});

export const LocationQuerySchema = z.object({
  search: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
});

export type CreateLocationInput = z.infer<typeof CreateLocationSchema>;
export type UpdateLocationInput = z.infer<typeof UpdateLocationSchema>;
export type LocationQuery = z.infer<typeof LocationQuerySchema>;
