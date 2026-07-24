import { z } from 'zod';

export const documentVisibilitySchema = z.enum(['private', 'tenant']);
export type DocumentVisibilitySchema = z.infer<typeof documentVisibilitySchema>;

export const DOCUMENT_STATUSES = ['queued', 'processing', 'ready', 'failed'] as const;
export const documentStatusEnumSchema = z.enum(DOCUMENT_STATUSES);
export type DocumentStatusEnum = z.infer<typeof documentStatusEnumSchema>;

export const documentSummarySchema = z.object({
  id: z.uuid(),
  title: z.string().trim().min(1, 'Ingresa un título').max(180, 'Máximo 180 caracteres'),
  visibility: documentVisibilitySchema,
  status: documentStatusEnumSchema,
  created_at: z.union([z.iso.datetime(), z.date()]),
});

export type DocumentSummarySchema = z.infer<typeof documentSummarySchema>;

export const documentStatusSchema = z.object({
  id: z.uuid(),
  status: documentStatusEnumSchema,
});

export type DocumentStatusSchema = z.infer<typeof documentStatusSchema>;
