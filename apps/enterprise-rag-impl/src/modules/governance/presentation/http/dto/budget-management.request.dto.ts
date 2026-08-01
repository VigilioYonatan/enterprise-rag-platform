import { z } from 'zod';
import { MAX_DAILY_COST_LIMIT_USD } from '../../../const/governance.const';
import { tenantBudgetSchema } from '../../../domain/schemas/tenant-budget.schema';

export const updateBudgetRequestDto = tenantBudgetSchema
  .pick({
    daily_answer_limit: true,
  })
  .extend({
    daily_cost_limit_usd: z.number().min(0).max(MAX_DAILY_COST_LIMIT_USD).optional(),
  })
  .strict();

export type UpdateBudgetRequestDto = z.output<typeof updateBudgetRequestDto>;
