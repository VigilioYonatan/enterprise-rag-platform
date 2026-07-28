import { z } from 'zod';
import { conversationSchema } from '../../../domain/schemas/conversation.schema';

export const createConversationRequestDto = conversationSchema
  .pick({
    knowledge_base_id: true,
    title: true,
  })
  .strict();

export type CreateConversationRequestDto = z.output<typeof createConversationRequestDto>;
