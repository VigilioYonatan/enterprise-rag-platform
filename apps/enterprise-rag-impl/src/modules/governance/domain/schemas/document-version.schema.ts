import { z } from 'zod';

export const documentVersionSchema = z.object({
  id: z.uuid(),
  document_id: z.uuid().optional(),
  tenant_id: z.uuid().optional(),
  version: z.number().int(),
  sha256: z.string().nullable(),
  media_type: z.string().nullable(),
  original_filename: z.string().nullable(),
  created_at: z.union([z.string(), z.date()]),
});

export type DocumentVersionSchema = z.infer<typeof documentVersionSchema>;
