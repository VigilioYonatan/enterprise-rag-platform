import { z } from 'zod';
import { answerCitationSchema } from './answer-citation.schema';

export const answerResultSchema = z.object({
  answer: z.string(),
  abstained: z.boolean(),
  citations: z.array(answerCitationSchema),
});

export type AnswerResultSchema = z.infer<typeof answerResultSchema>;
