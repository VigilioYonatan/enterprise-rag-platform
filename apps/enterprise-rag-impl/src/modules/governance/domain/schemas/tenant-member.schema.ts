import { z } from 'zod';

export const tenantRoleSchema = z.enum(['owner', 'admin', 'viewer']);
export type TenantRoleSchema = z.infer<typeof tenantRoleSchema>;

export const tenantMemberSchema = z.object({
  user_sub: z.string().min(1).max(255),
  email: z.string().nullable().optional(),
  role: tenantRoleSchema,
});

export type TenantMemberSchema = z.infer<typeof tenantMemberSchema>;
