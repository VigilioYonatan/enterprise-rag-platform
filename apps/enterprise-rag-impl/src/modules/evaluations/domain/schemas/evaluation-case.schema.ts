import { z } from 'zod';

export const evaluationCaseSchema = z.object({
  id: z.uuid(),
  dataset_id: z.uuid().optional(),
  question: z.string().trim().min(2).max(500),
  expected_document_ids: z.array(z.uuid()).max(20),
  expected_abstention: z.boolean().default(false),
});

export type EvaluationCaseSchema = z.infer<typeof evaluationCaseSchema>;
