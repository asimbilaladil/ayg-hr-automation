import { z } from 'zod';

export const SetSyncCursorSchema = z.object({
  value: z.string().min(1),
});

export type SetSyncCursorInput = z.infer<typeof SetSyncCursorSchema>;
