import { z } from 'zod';
import { evaluationCaseSchema } from '../../../domain/schemas/evaluation-case.schema';

export const createCaseRequestDto = evaluationCaseSchema
  .omit({
    id: true,
    dataset_id: true,
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.expected_abstention === value.expected_document_ids.length > 0) {
      ctx.addIssue({
        code: 'custom',
        message: 'Abstention requires zero document ids and positive cases require at least one',
        path: ['expected_document_ids'],
      });
    }
  });

export type CreateCaseRequestDto = z.output<typeof createCaseRequestDto>;
