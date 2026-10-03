import type {
  CreateKnowledgeBaseRequestDto,
  CreateTenantRequestDto,
  KnowledgeBaseResponseDto,
  TenantResponseDto,
  UpdateKnowledgeBaseRequestDto,
} from '@enterprise-rag/contracts';
import { api, apiList } from '~/services/api';

export async function listTenantsApi(): Promise<TenantResponseDto[]> {
  return apiList<TenantResponseDto>('/tenants');
}

export async function createTenantApi(data: CreateTenantRequestDto): Promise<TenantResponseDto> {
  return api<TenantResponseDto>('/tenants', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function listKnowledgeBasesApi(tenant_id: string): Promise<KnowledgeBaseResponseDto[]> {
  return apiList<KnowledgeBaseResponseDto>(`/knowledge-bases?tenant_id=${encodeURIComponent(tenant_id)}`);
}

export async function createKnowledgeBaseApi(
  tenant_id: string,
  data: CreateKnowledgeBaseRequestDto,
): Promise<KnowledgeBaseResponseDto> {
  return api<KnowledgeBaseResponseDto>('/knowledge-bases', {
    method: 'POST',
    body: JSON.stringify({ ...data, tenant_id }),
  });
}

export async function renameKnowledgeBaseApi(
  knowledge_base_id: string,
  data: UpdateKnowledgeBaseRequestDto,
): Promise<KnowledgeBaseResponseDto> {
  return api<KnowledgeBaseResponseDto>(`/knowledge-bases/${encodeURIComponent(knowledge_base_id)}`, {
    method: 'PATCH',
    body: JSON.stringify({ name: data.name.trim() }),
  });
}

export async function deleteKnowledgeBaseApi(knowledge_base_id: string): Promise<{ deleted: boolean }> {
  return api<{ deleted: boolean }>(`/knowledge-bases/${encodeURIComponent(knowledge_base_id)}`, {
    method: 'DELETE',
  });
}
