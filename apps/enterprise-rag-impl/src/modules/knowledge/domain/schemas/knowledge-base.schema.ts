import { z } from 'zod';

export const knowledgeBaseSchema = z.object({
  id: z.uuid(),
  tenant_id: z.uuid(),
  name: z.string().trim().min(2, 'Mínimo dos caracteres').max(120, 'Máximo 120 caracteres'),
});

export type KnowledgeBaseSchema = z.infer<typeof knowledgeBaseSchema>;
