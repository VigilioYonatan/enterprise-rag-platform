import type {
  CreateTextDocumentRequestDto,
  DocumentChunkResponseDto,
  DocumentDetailResponseDto,
  DocumentGrantResponseDto,
  DocumentSummaryResponseDto,
  DocumentVersionResponseDto,
  GroupGrantResponseDto,
  IngestionJobResponseDto,
} from '@enterprise-rag/contracts';
import { api, apiList, apiPaginated, downloadDocument, type PaginatedResponse } from '~/services/api';

export async function listDocumentsApi(
  knowledge_base_id: string,
  limit: number,
  offset: number,
): Promise<PaginatedResponse<DocumentSummaryResponseDto>> {
  return apiPaginated<DocumentSummaryResponseDto>(
    `/knowledge-bases/${encodeURIComponent(knowledge_base_id)}/documents?limit=${limit}&offset=${offset}`,
  );
}

export async function getDocumentDetailApi(document_id: string): Promise<DocumentDetailResponseDto> {
  return api<DocumentDetailResponseDto>(`/documents/${encodeURIComponent(document_id)}`);
}

export async function createTextDocumentApi(
  knowledge_base_id: string,
  data: CreateTextDocumentRequestDto,
): Promise<{ id: string; status: string }> {
  return api<{ id: string; status: string }>(
    `/knowledge-bases/${encodeURIComponent(knowledge_base_id)}/documents`,
    {
      method: 'POST',
      body: JSON.stringify(data),
    },
  );
}

export async function uploadDocumentBinaryApi(
  knowledge_base_id: string,
  formData: FormData,
): Promise<{ id: string; status: string }> {
  return api<{ id: string; status: string }>(
    `/knowledge-bases/${encodeURIComponent(knowledge_base_id)}/uploads`,
    {
      method: 'POST',
      body: formData,
    },
  );
}

export async function createDocumentVersionApi(
  document_id: string,
  data: FormData | { title?: string; text: string },
): Promise<{ id: string; version: number }> {
  const endpoint = `/documents/${encodeURIComponent(document_id)}/versions`;
  if (data instanceof FormData) {
    return api<{ id: string; version: number }>(endpoint, {
      method: 'POST',
      body: data,
    });
  }
  return api<{ id: string; version: number }>(endpoint, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function deleteDocumentApi(document_id: string): Promise<{ deleted: boolean }> {
  return api<{ deleted: boolean }>(`/documents/${encodeURIComponent(document_id)}`, {
    method: 'DELETE',
  });
}

export async function getDocumentChunksApi(
  document_id: string,
  limit = 100,
  offset = 0,
): Promise<DocumentChunkResponseDto[]> {
  return apiList<DocumentChunkResponseDto>(
    `/documents/${encodeURIComponent(document_id)}/chunks?limit=${limit}&offset=${offset}`,
  );
}

export async function getDocumentVersionsApi(
  document_id: string,
  limit = 50,
  offset = 0,
): Promise<DocumentVersionResponseDto[]> {
  return apiList<DocumentVersionResponseDto>(
    `/documents/${encodeURIComponent(document_id)}/versions?limit=${limit}&offset=${offset}`,
  );
}

export async function getDocumentJobApi(document_id: string): Promise<IngestionJobResponseDto> {
  return api<IngestionJobResponseDto>(`/documents/${encodeURIComponent(document_id)}/ingestion`);
}

export async function retryDocumentJobApi(document_id: string): Promise<{ id: string; status: string }> {
  return api<{ id: string; status: string }>(
    `/documents/${encodeURIComponent(document_id)}/ingestion/retry`,
    {
      method: 'POST',
    },
  );
}

export async function getDocumentGrantsApi(document_id: string): Promise<DocumentGrantResponseDto[]> {
  return api<DocumentGrantResponseDto[]>(`/documents/${encodeURIComponent(document_id)}/access`);
}

export async function replaceDocumentGrantsApi(
  document_id: string,
  user_subs: string[],
): Promise<{ document_id: string; granted_users: number }> {
  return api<{ document_id: string; granted_users: number }>(
    `/documents/${encodeURIComponent(document_id)}/access`,
    {
      method: 'PUT',
      body: JSON.stringify({ user_subs }),
    },
  );
}

export async function getDocumentGroupGrantsApi(document_id: string): Promise<GroupGrantResponseDto[]> {
  return api<GroupGrantResponseDto[]>(`/documents/${encodeURIComponent(document_id)}/group-access`);
}

export async function replaceDocumentGroupGrantsApi(
  document_id: string,
  group_ids: string[],
): Promise<{ document_id: string; group_count: number }> {
  return api<{ document_id: string; group_count: number }>(
    `/documents/${encodeURIComponent(document_id)}/group-access`,
    {
      method: 'PUT',
      body: JSON.stringify({ group_ids }),
    },
  );
}

export async function downloadDocumentContentApi(document_id: string, filename: string): Promise<void> {
  return downloadDocument(document_id, filename);
}
