import { z } from 'zod';
import { documentVisibilitySchema } from '../../../../knowledge/domain/schemas/document.schema';
import {
  MAX_DOCUMENT_TITLE_LENGTH,
  MAX_TEXT_DOCUMENT_CHARACTERS,
  MAX_TEXT_DOCUMENT_UTF8_BYTES,
} from '../../../const/uploads.const';

export const uploadMetadataRequestDto = z
  .object({
    title: z.string().trim().min(1).max(MAX_DOCUMENT_TITLE_LENGTH),
    visibility: documentVisibilitySchema,
  })
  .strict();

export const textVersionRequestDto = z
  .object({
    title: z.string().trim().min(1).max(MAX_DOCUMENT_TITLE_LENGTH).optional(),
    text: z
      .string()
      .min(1)
      .max(MAX_TEXT_DOCUMENT_CHARACTERS)
      .refine(
        (encodedValue) => new TextEncoder().encode(encodedValue).length <= MAX_TEXT_DOCUMENT_UTF8_BYTES,
        'Max 100 KiB UTF-8',
      ),
  })
  .strict();

export type UploadMetadataRequestDto = z.output<typeof uploadMetadataRequestDto>;
export type TextVersionRequestDto = z.output<typeof textVersionRequestDto>;
