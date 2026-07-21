import { z } from 'zod';
import { uploadDocumentSchema } from '../../../domain/schemas/upload-document.schema';

export const uploadedDocumentResponseDto = uploadDocumentSchema.pick({
  id: true,
  status: true,
});

export const documentVersionCreatedResponseDto = uploadDocumentSchema.pick({
  id: true,
  version: true,
  status: true,
});

export type UploadedDocumentResponseDto = z.output<typeof uploadedDocumentResponseDto>;
export type DocumentVersionCreatedResponseDto = z.output<typeof documentVersionCreatedResponseDto>;
