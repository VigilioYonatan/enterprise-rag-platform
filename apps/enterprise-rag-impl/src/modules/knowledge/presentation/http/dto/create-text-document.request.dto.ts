import { z } from 'zod';
import { MAX_TEXT_DOCUMENT_CHARACTERS, MAX_TEXT_DOCUMENT_UTF8_BYTES } from '../../../const/knowledge.const';
import { documentSummarySchema } from '../../../domain/schemas/document.schema';

export const createTextDocumentRequestDto = documentSummarySchema
  .pick({
    title: true,
  })
  .extend({
    text: z
      .string()
      .min(1)
      .max(MAX_TEXT_DOCUMENT_CHARACTERS)
      .refine(
        (value) => new TextEncoder().encode(value).length <= MAX_TEXT_DOCUMENT_UTF8_BYTES,
        'Max 100 KiB UTF-8',
      ),
    visibility: documentSummarySchema.shape.visibility.default('private'),
  })
  .strict();

export type CreateTextDocumentRequestDto = z.output<typeof createTextDocumentRequestDto>;
