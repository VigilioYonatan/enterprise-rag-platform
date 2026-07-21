import { z } from 'zod';

export const uploadDocumentSchema = z.object({
  id: z.uuid(),
  status: z.string(),
  version: z.number().int().min(1).default(1),
});

export type UploadDocumentSchema = z.infer<typeof uploadDocumentSchema>;
