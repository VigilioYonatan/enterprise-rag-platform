import { z } from 'zod';

export const dlqSourceSchema = z.enum(['ingestion_job', 'outbox_event']);
export type DlqSourceSchema = z.infer<typeof dlqSourceSchema>;

export const dlqItemSchema = z.object({
  id: z.uuid(),
  source: dlqSourceSchema,
  target_id: z.string(),
  title: z.string().nullable(),
  attempts: z.number().int(),
  error_message: z.string().nullable(),
  updated_at: z.union([z.string(), z.date()]),
});

export type DlqItemSchema = z.infer<typeof dlqItemSchema>;
