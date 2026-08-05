import { z } from 'zod';

export const evaluationCaseResultSchema = z.object({
  case_id: z.uuid(),
  rank_of_first_match: z.number().int().nullable(),
  recall_at_6: z.number(),
  ndcg_at_6: z.number(),
  precision_at_6: z.number(),
  abstention_pass: z.boolean().nullable(),
  retrieved_document_ids: z.array(z.uuid()),
});

export type EvaluationCaseResultSchema = z.infer<typeof evaluationCaseResultSchema>;
