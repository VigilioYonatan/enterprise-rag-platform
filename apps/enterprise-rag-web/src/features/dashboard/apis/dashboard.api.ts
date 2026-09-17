import type { TenantResponseDto } from '@enterprise-rag/contracts';
import { apiPaginated, type PaginatedResponse } from '~/services/api';

export async function getTenantsSummaryApi(
  limit = 10,
  offset = 0,
): Promise<PaginatedResponse<TenantResponseDto>> {
  return apiPaginated<TenantResponseDto>(`/tenants?limit=${limit}&offset=${offset}`);
}
