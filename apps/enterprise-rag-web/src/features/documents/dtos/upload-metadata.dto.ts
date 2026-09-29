import { uploadMetadataRequestDto } from '@enterprise-rag/contracts';
import { z } from 'zod';

export const uploadMetadataDto = uploadMetadataRequestDto.extend({
  title: z.string().trim().max(180).optional(),
});

export type UploadMetadataDto = z.infer<typeof uploadMetadataDto>;
