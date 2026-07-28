import { z } from 'zod';
import { conversationCitationSchema } from './conversation-citation.schema';

export const messageRoleSchema = z.enum(['user', 'assistant']);
export type MessageRoleSchema = z.infer<typeof messageRoleSchema>;

export const conversationMessageSchema = z.object({
  id: z.uuid(),
  conversation_id: z.uuid().optional(),
  role: messageRoleSchema,
  content: z.string(),
  abstained: z.boolean().default(false),
  created_at: z.union([z.string(), z.date()]),
  citations: z.array(conversationCitationSchema).default([]),
});

export type ConversationMessageSchema = z.infer<typeof conversationMessageSchema>;
