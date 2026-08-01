import { z } from 'zod';

export const tenantBudgetSchema = z.object({
  tenant_id: z.uuid(),
  daily_answer_limit: z.number().int().min(1).max(10_000),
  daily_cost_limit_usd: z.number().min(0).max(1_000_000),
  updated_at: z.union([z.string(), z.date()]).optional(),
});

export type TenantBudgetSchema = z.infer<typeof tenantBudgetSchema>;
