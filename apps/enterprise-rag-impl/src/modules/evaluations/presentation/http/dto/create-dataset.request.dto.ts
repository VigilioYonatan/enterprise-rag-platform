import { z } from 'zod';
import { evaluationDatasetSchema } from '../../../domain/schemas/evaluation-dataset.schema';

export const createDatasetRequestDto = evaluationDatasetSchema
  .pick({
    tenant_id: true,
    knowledge_base_id: true,
    name: true,
  })
  .strict();

export type CreateDatasetRequestDto = z.output<typeof createDatasetRequestDto>;
