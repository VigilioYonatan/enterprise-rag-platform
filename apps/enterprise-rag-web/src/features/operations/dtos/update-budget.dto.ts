import { tenantBudgetSchema } from '@enterprise-rag/contracts';
import { z } from 'zod';

export const requiredNumericString = (label: string) =>
  z
    .union([z.string(), z.number()])
    .transform((val) => String(val).trim())
    .refine((val) => val.length > 0, `${label} es obligatorio`)
    .transform((val) => Number(val))
    .refine((val) => Number.isFinite(val), `${label} debe ser numérico`);

export const updateBudgetDto = z.object({
  daily_answer_limit: requiredNumericString('El límite diario de consultas').pipe(
    tenantBudgetSchema.shape.daily_answer_limit,
  ),
  daily_cost_limit_usd: requiredNumericString('El presupuesto diario USD').pipe(
    tenantBudgetSchema.shape.daily_cost_limit_usd,
  ),
});

export type UpdateBudgetDto = z.infer<typeof updateBudgetDto>;
