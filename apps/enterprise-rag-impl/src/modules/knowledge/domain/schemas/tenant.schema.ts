import { z } from 'zod';

export const tenantSchema = z.object({
  id: z.uuid(),
  name: z.string().trim().min(2, 'Mínimo dos caracteres').max(100, 'Máximo 100 caracteres'),
});

export type TenantSchema = z.infer<typeof tenantSchema>;
