import { z } from 'zod';

export const evaluationRunStatusSchema = z.enum(['running', 'completed', 'failed']);
export type EvaluationRunStatusSchema = z.infer<typeof evaluationRunStatusSchema>;

export const evaluationRunSchema = z.object({
  id: z.uuid(),
  dataset_id: z.uuid().optional(),
  dataset_name: z.string().optional(),
  status: evaluationRunStatusSchema,
  recall_at_6: z.number().nullable(),
  mrr_at_6: z.number().nullable(),
  ndcg_at_6: z.number().nullable(),
  precision_at_6: z.number().nullable(),
  abstention_pass_rate: z.number().nullable(),
  dataset_revision: z.number().int(),
  case_count: z.number().int(),
  started_at: z.union([z.string(), z.date()]).optional(),
  completed_at: z.union([z.string(), z.date()]).nullable().optional(),
});

export type EvaluationRunSchema = z.infer<typeof evaluationRunSchema>;
