import type {
  AuditEventItemResponseDto,
  DlqItemResponseDto,
  DlqSourceSchema,
  TenantBudgetResponseDto,
  UsageSummaryItemResponseDto,
} from '@enterprise-rag/contracts';
import { api, apiPaginated, type PaginatedResponse } from '~/services/api';
import type { UpdateBudgetDto } from '../dtos/update-budget.dto';

export async function getUsageSummaryApi(tenant_id: string): Promise<UsageSummaryItemResponseDto[]> {
  return api<UsageSummaryItemResponseDto[]>(`/usage/summary?tenant_id=${encodeURIComponent(tenant_id)}`);
}

export async function getBudgetApi(tenant_id: string): Promise<TenantBudgetResponseDto> {
  return api<TenantBudgetResponseDto>(`/usage/budget?tenant_id=${encodeURIComponent(tenant_id)}`);
}

export async function updateBudgetApi(
  tenant_id: string,
  data: UpdateBudgetDto,
): Promise<TenantBudgetResponseDto> {
  return api<TenantBudgetResponseDto>(`/usage/budget/${encodeURIComponent(tenant_id)}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function listDlqApi(
  tenant_id: string,
  limit = 25,
  offset = 0,
): Promise<PaginatedResponse<DlqItemResponseDto>> {
  return apiPaginated<DlqItemResponseDto>(
    `/operations/dlq?tenant_id=${encodeURIComponent(tenant_id)}&limit=${limit}&offset=${offset}`,
  );
}

export async function replayDlqApi(
  dlq_id: string,
  source: DlqSourceSchema,
): Promise<{ id: string; source: string; status: string }> {
  return api<{ id: string; source: string; status: string }>(
    `/operations/dlq/${encodeURIComponent(dlq_id)}/replay`,
    {
      method: 'POST',
      body: JSON.stringify({ source }),
    },
  );
}

export async function listAuditEventsApi(
  tenant_id: string,
  limit = 20,
  offset = 0,
): Promise<PaginatedResponse<AuditEventItemResponseDto>> {
  return apiPaginated<AuditEventItemResponseDto>(
    `/audit/events?tenant_id=${encodeURIComponent(tenant_id)}&limit=${limit}&offset=${offset}`,
  );
}
