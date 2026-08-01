import { z } from 'zod';

export const accessGroupSchema = z.object({
  id: z.uuid(),
  tenant_id: z.uuid(),
  name: z.string().trim().min(2).max(100),
  member_count: z.number().int().default(0),
});

export type AccessGroupSchema = z.infer<typeof accessGroupSchema>;
