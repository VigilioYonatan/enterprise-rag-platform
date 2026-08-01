import { z } from 'zod';
import { tenantMemberSchema } from '../../../domain/schemas/tenant-member.schema';

export const modifyRoleRequestDto = tenantMemberSchema
  .pick({
    role: true,
  })
  .strict();

export const inviteMemberRequestDto = z
  .object({
    email: z.email('Correo inválido'),
    role: z.enum(['admin', 'viewer']).default('viewer'),
  })
  .strict();

export type ModifyRoleRequestDto = z.output<typeof modifyRoleRequestDto>;
export type InviteMemberRequestDto = z.output<typeof inviteMemberRequestDto>;
