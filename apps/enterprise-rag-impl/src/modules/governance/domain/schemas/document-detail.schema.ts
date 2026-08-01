import { z } from 'zod';
import {
  documentStatusEnumSchema,
  documentVisibilitySchema,
} from '../../../knowledge/domain/schemas/document.schema';

export const documentDetailSchema = z.object({
  id: z.uuid(),
  tenant_id: z.uuid(),
  knowledge_base_id: z.uuid(),
  title: z.string(),
  visibility: documentVisibilitySchema,
  status: documentStatusEnumSchema,
  version: z.number().int(),
  owner_sub: z.string(),
  created_at: z.union([z.string(), z.date()]),
  media_type: z.string().nullable(),
  original_filename: z.string().nullable(),
  byte_size: z.number().int().nullable(),
});

export type DocumentDetailSchema = z.infer<typeof documentDetailSchema>;
