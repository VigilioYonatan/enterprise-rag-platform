import { z } from 'zod';
import { dlqSourceSchema } from '../../../domain/schemas/dlq-item.schema';

export const replayDlqRequestDto = z
  .object({
    source: dlqSourceSchema.default('ingestion_job'),
  })
  .strict();

export type ReplayDlqRequestDto = z.output<typeof replayDlqRequestDto>;
