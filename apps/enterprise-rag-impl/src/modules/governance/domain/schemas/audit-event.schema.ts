import { z } from 'zod';

export const auditEventSchema = z.object({
  id: z.uuid(),
  tenant_id: z.uuid().optional(),
  action: z.string(),
  target_type: z.string(),
  target_id: z.string(),
  actor_sub: z.string(),
  created_at: z.union([z.string(), z.date()]),
});

export type AuditEventSchema = z.infer<typeof auditEventSchema>;
