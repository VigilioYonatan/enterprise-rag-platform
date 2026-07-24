import { z } from 'zod';

export const searchHitSchema = z.object({
  chunk_id: z.uuid(),
  document_id: z.uuid(),
  document_version: z.number().int(),
  title: z.string(),
  content: z.string(),
  score: z.number(),
});

export type SearchHitSchema = z.infer<typeof searchHitSchema>;
