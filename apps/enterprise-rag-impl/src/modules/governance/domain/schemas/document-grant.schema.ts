import { z } from 'zod';

export const documentGrantSchema = z.object({
  document_id: z.uuid().optional(),
  user_sub: z.string().min(1).max(255),
  email: z.string().nullable().optional(),
  created_at: z.union([z.string(), z.date()]).optional(),
});

export type DocumentGrantSchema = z.infer<typeof documentGrantSchema>;
