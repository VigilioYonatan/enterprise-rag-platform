import { z } from 'zod';

export const documentChunkSchema = z.object({
  id: z.uuid(),
  tenant_id: z.uuid().optional(),
  document_id: z.uuid().optional(),
  ordinal: z.number().int(),
  content: z.string(),
  document_version: z.number().int(),
});

export type DocumentChunkSchema = z.infer<typeof documentChunkSchema>;
