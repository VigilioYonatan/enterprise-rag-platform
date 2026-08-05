import { z } from 'zod';

export const evaluationDatasetSchema = z.object({
  id: z.uuid(),
  tenant_id: z.uuid(),
  knowledge_base_id: z.uuid(),
  name: z.string().trim().min(2, 'Mínimo dos caracteres').max(120),
  revision: z.number().int().default(1),
  created_at: z.union([z.string(), z.date()]).optional(),
});

export type EvaluationDatasetSchema = z.infer<typeof evaluationDatasetSchema>;
