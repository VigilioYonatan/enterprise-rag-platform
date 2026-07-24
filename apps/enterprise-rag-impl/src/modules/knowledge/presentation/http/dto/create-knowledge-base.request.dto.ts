import { z } from 'zod';
import { knowledgeBaseSchema } from '../../../domain/schemas/knowledge-base.schema';

export const createKnowledgeBaseRequestDto = knowledgeBaseSchema
  .pick({
    tenant_id: true,
    name: true,
  })
  .strict();

export type CreateKnowledgeBaseRequestDto = z.output<typeof createKnowledgeBaseRequestDto>;
