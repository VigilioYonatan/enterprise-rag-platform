import { z } from 'zod';

export const INGESTION_JOB_STATUSES = ['pending', 'processing', 'completed', 'failed'] as const;
export const ingestionJobStatusSchema = z.enum(INGESTION_JOB_STATUSES);
export type IngestionJobStatus = z.infer<typeof ingestionJobStatusSchema>;

export const ingestionJobSchema = z.object({
  id: z.uuid(),
  document_id: z.uuid().optional(),
  status: ingestionJobStatusSchema,
  stage: z.string(),
  attempts: z.number().int(),
  created_at: z.union([z.string(), z.date()]),
  updated_at: z.union([z.string(), z.date()]).optional(),
  completed_at: z.union([z.string(), z.date()]).nullable(),
  error_message: z.string().nullable(),
});

export type IngestionJobSchema = z.infer<typeof ingestionJobSchema>;
