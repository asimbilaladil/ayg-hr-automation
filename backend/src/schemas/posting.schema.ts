import { z } from 'zod';

export const CreatePostingSchema = z.object({
  name: z.string().min(1, 'Posting name is required'),
  isActive: z.boolean().default(true),
});

export const UpdatePostingSchema = z.object({
  name: z.string().min(1, 'Posting name is required').optional(),
  isActive: z.boolean().optional(),
});

export const PostingQuerySchema = z.object({
  search: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
});

export type CreatePostingInput = z.infer<typeof CreatePostingSchema>;
export type UpdatePostingInput = z.infer<typeof UpdatePostingSchema>;
export type PostingQuery = z.infer<typeof PostingQuerySchema>;
