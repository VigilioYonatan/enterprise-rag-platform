import { z } from 'zod';

export const answerCitationSchema = z.object({
  index: z.number().int().min(1),
  document_id: z.uuid(),
  chunk_id: z.uuid(),
  document_version: z.number().int().min(1),
  title: z.string(),
});

export type AnswerCitationSchema = z.infer<typeof answerCitationSchema>;
