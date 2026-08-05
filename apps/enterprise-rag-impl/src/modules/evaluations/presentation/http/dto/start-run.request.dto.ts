import { z } from 'zod';

export const startRunRequestDto = z
  .object({
    dataset_id: z.uuid(),
  })
  .strict();

export type StartRunRequestDto = z.output<typeof startRunRequestDto>;
