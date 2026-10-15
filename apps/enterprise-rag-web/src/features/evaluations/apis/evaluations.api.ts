import type {
  CaseResponseDto,
  CreateCaseRequestDto,
  CreateDatasetRequestDto,
  DatasetResponseDto,
  RunDetailResponseDto,
  RunSummaryResponseDto,
} from '@enterprise-rag/contracts';
import { api, apiList } from '~/services/api';

export async function listDatasetsApi(tenant_id: string): Promise<DatasetResponseDto[]> {
  return apiList<DatasetResponseDto>(`/evaluation/datasets?tenant_id=${encodeURIComponent(tenant_id)}`);
}

export async function createDatasetApi(
  tenant_id: string,
  knowledge_base_id: string,
  data: Pick<CreateDatasetRequestDto, 'name'>,
): Promise<DatasetResponseDto> {
  return api<DatasetResponseDto>('/evaluation/datasets', {
    method: 'POST',
    body: JSON.stringify({ ...data, tenant_id, knowledge_base_id }),
  });
}

export async function deleteDatasetApi(dataset_id: string): Promise<{ deleted: boolean }> {
  return api<{ deleted: boolean }>(`/evaluation/datasets/${encodeURIComponent(dataset_id)}`, {
    method: 'DELETE',
  });
}

export async function listCasesApi(dataset_id: string, limit = 100, offset = 0): Promise<CaseResponseDto[]> {
  return apiList<CaseResponseDto>(
    `/evaluation/datasets/${encodeURIComponent(dataset_id)}/cases?limit=${limit}&offset=${offset}`,
  );
}

export async function createCaseApi(
  dataset_id: string,
  data: CreateCaseRequestDto,
): Promise<CaseResponseDto> {
  return api<CaseResponseDto>(`/evaluation/datasets/${encodeURIComponent(dataset_id)}/cases`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function deleteCaseApi(dataset_id: string, case_id: string): Promise<{ deleted: boolean }> {
  return api<{ deleted: boolean }>(
    `/evaluation/datasets/${encodeURIComponent(dataset_id)}/cases/${encodeURIComponent(case_id)}`,
    {
      method: 'DELETE',
    },
  );
}

export async function listRunsApi(
  tenant_id: string,
  limit = 25,
  offset = 0,
): Promise<RunSummaryResponseDto[]> {
  return apiList<RunSummaryResponseDto>(
    `/evaluation/runs?tenant_id=${encodeURIComponent(tenant_id)}&limit=${limit}&offset=${offset}`,
  );
}

export async function getRunDetailApi(run_id: string): Promise<RunDetailResponseDto> {
  return api<RunDetailResponseDto>(`/evaluation/runs/${encodeURIComponent(run_id)}`);
}

export async function startEvaluationRunApi(dataset_id: string): Promise<RunSummaryResponseDto> {
  return api<RunSummaryResponseDto>('/evaluation/runs', {
    method: 'POST',
    body: JSON.stringify({ dataset_id }),
  });
}
