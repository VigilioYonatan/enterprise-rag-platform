import { z } from 'zod';

export const searchKnowledgeRequestDto = z
  .object({
    knowledge_base_id: z.uuid(),
    query: z.string().trim().min(2).max(500),
  })
  .strict();

export type SearchKnowledgeRequestDto = z.output<typeof searchKnowledgeRequestDto>;
