import { z } from 'zod';

export const conversationCitationSchema = z.object({
  id: z.uuid(),
  message_id: z.uuid().optional(),
  document_id: z.uuid(),
  chunk_id: z.uuid(),
  reference_index: z.number().int().optional(),
  index: z.number().int().optional(),
  document_version: z.number().int(),
  title: z.string(),
  content: z.string().optional(),
});

export type ConversationCitationSchema = z.infer<typeof conversationCitationSchema>;
