import { z } from 'zod';

export const conversationSchema = z.object({
  id: z.uuid(),
  knowledge_base_id: z.uuid(),
  tenant_id: z.uuid().optional(),
  title: z.string().trim().min(1, 'Ingresa un título').max(140, 'Máximo 140 caracteres'),
  created_at: z.union([z.string(), z.date()]),
});

export type ConversationSchema = z.infer<typeof conversationSchema>;
