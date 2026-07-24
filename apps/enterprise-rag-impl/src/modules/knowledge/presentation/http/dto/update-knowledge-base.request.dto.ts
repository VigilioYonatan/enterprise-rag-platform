import { z } from 'zod';
import { knowledgeBaseSchema } from '../../../domain/schemas/knowledge-base.schema';

export const updateKnowledgeBaseRequestDto = knowledgeBaseSchema
  .pick({
    name: true,
  })
  .strict();

export type UpdateKnowledgeBaseRequestDto = z.output<typeof updateKnowledgeBaseRequestDto>;
