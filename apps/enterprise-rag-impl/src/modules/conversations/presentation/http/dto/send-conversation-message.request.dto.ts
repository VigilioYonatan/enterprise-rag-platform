import { z } from 'zod';
import { MAX_QUESTION_LENGTH } from '../../../const/conversations.const';

export const sendConversationMessageRequestDto = z
  .object({
    question: z.string().trim().min(2).max(MAX_QUESTION_LENGTH),
  })
  .strict();

export type SendConversationMessageRequestDto = z.output<typeof sendConversationMessageRequestDto>;
