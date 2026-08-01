import { z } from 'zod';

export const accessGroupMemberSchema = z.object({
  group_id: z.uuid().optional(),
  user_sub: z.string().min(1).max(255),
  email: z.string().nullable().optional(),
});

export type AccessGroupMemberSchema = z.infer<typeof accessGroupMemberSchema>;
