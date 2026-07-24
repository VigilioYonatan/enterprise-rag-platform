import { z } from 'zod';
import { tenantSchema } from '../../../domain/schemas/tenant.schema';

export const createTenantRequestDto = tenantSchema.pick({ name: true }).strict();

export type CreateTenantRequestDto = z.output<typeof createTenantRequestDto>;
