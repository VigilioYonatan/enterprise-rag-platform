import { z } from 'zod';

export const askQuestionRequestDto = z
  .object({
    knowledge_base_id: z.uuid(),
    question: z.string().trim().min(2).max(500),
  })
  .strict();

export type AskQuestionRequestDto = z.output<typeof askQuestionRequestDto>;
