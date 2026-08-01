import { z } from 'zod';
import { accessGroupSchema } from '../../../domain/schemas/access-group.schema';
import { accessGroupMemberSchema } from '../../../domain/schemas/access-group-member.schema';

export const createGroupRequestDto = accessGroupSchema
  .pick({
    tenant_id: true,
    name: true,
  })
  .strict();

export const groupMemberRequestDto = accessGroupMemberSchema
  .pick({
    user_sub: true,
  })
  .strict();

export type CreateGroupRequestDto = z.output<typeof createGroupRequestDto>;
export type GroupMemberRequestDto = z.output<typeof groupMemberRequestDto>;
