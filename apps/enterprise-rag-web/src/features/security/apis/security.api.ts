import type {
  CreateGroupRequestDto,
  GroupMemberResponseDto,
  GroupSummaryResponseDto,
  InviteMemberRequestDto,
  MemberResponseDto,
  RoleChangedResponseDto,
  TenantRoleSchema,
} from '@enterprise-rag/contracts';
import { api, apiList } from '~/services/api';

export async function listMembersApi(
  tenant_id: string,
  limit = 100,
  offset = 0,
): Promise<MemberResponseDto[]> {
  return apiList<MemberResponseDto>(
    `/tenants/${encodeURIComponent(tenant_id)}/members?limit=${limit}&offset=${offset}`,
  );
}

export async function addMemberApi(
  tenant_id: string,
  data: InviteMemberRequestDto,
): Promise<MemberResponseDto> {
  return api<MemberResponseDto>(`/tenants/${encodeURIComponent(tenant_id)}/members`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function changeMemberRoleApi(
  tenant_id: string,
  user_sub: string,
  role: TenantRoleSchema,
): Promise<RoleChangedResponseDto> {
  return api<RoleChangedResponseDto>(
    `/tenants/${encodeURIComponent(tenant_id)}/members/${encodeURIComponent(user_sub)}`,
    {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    },
  );
}

export async function removeMemberApi(tenant_id: string, user_sub: string): Promise<{ removed: boolean }> {
  return api<{ removed: boolean }>(
    `/tenants/${encodeURIComponent(tenant_id)}/members/${encodeURIComponent(user_sub)}`,
    {
      method: 'DELETE',
    },
  );
}

export async function listGroupsApi(
  tenant_id: string,
  limit = 100,
  offset = 0,
): Promise<GroupSummaryResponseDto[]> {
  return apiList<GroupSummaryResponseDto>(
    `/tenants/${encodeURIComponent(tenant_id)}/groups?limit=${limit}&offset=${offset}`,
  );
}

export async function createGroupApi(
  tenant_id: string,
  data: CreateGroupRequestDto,
): Promise<GroupSummaryResponseDto> {
  return api<GroupSummaryResponseDto>('/groups', {
    method: 'POST',
    body: JSON.stringify({ ...data, tenant_id }),
  });
}

export async function deleteGroupApi(group_id: string): Promise<{ removed: boolean }> {
  return api<{ removed: boolean }>(`/groups/${encodeURIComponent(group_id)}`, {
    method: 'DELETE',
  });
}

export async function listGroupMembersApi(
  group_id: string,
  limit = 100,
  offset = 0,
): Promise<GroupMemberResponseDto[]> {
  return apiList<GroupMemberResponseDto>(
    `/groups/${encodeURIComponent(group_id)}/members?limit=${limit}&offset=${offset}`,
  );
}

export async function addGroupMemberApi(group_id: string, user_sub: string): Promise<{ user_sub: string }> {
  return api<{ user_sub: string }>(`/groups/${encodeURIComponent(group_id)}/members`, {
    method: 'POST',
    body: JSON.stringify({ user_sub }),
  });
}

export async function removeGroupMemberApi(
  group_id: string,
  user_sub: string,
): Promise<{ removed: boolean }> {
  return api<{ removed: boolean }>(
    `/groups/${encodeURIComponent(group_id)}/members/${encodeURIComponent(user_sub)}`,
    {
      method: 'DELETE',
    },
  );
}
