import type {
  ConversationDetailResponseDto,
  ConversationSummaryResponseDto,
  CreateConversationRequestDto,
  ResolvedCitationResponseDto,
} from '@enterprise-rag/contracts';
import { api, apiList, type SseFrame, streamConversationMessage } from '~/services/api';

export async function listConversationsApi(
  knowledge_base_id: string,
  limit = 50,
  offset = 0,
): Promise<ConversationSummaryResponseDto[]> {
  return apiList<ConversationSummaryResponseDto>(
    `/conversations?knowledge_base_id=${encodeURIComponent(knowledge_base_id)}&limit=${limit}&offset=${offset}`,
  );
}

export async function getConversationApi(conversation_id: string): Promise<ConversationDetailResponseDto> {
  return api<ConversationDetailResponseDto>(`/conversations/${encodeURIComponent(conversation_id)}`);
}

export async function createConversationApi(
  knowledge_base_id: string,
  data: CreateConversationRequestDto,
): Promise<ConversationSummaryResponseDto> {
  return api<ConversationSummaryResponseDto>('/conversations', {
    method: 'POST',
    body: JSON.stringify({ ...data, knowledge_base_id }),
  });
}

export async function deleteConversationApi(conversation_id: string): Promise<{ deleted: boolean }> {
  return api<{ deleted: boolean }>(`/conversations/${encodeURIComponent(conversation_id)}`, {
    method: 'DELETE',
  });
}

export async function resolveCitationApi(
  conversation_id: string,
  citation_id: string,
): Promise<ResolvedCitationResponseDto> {
  return api<ResolvedCitationResponseDto>(
    `/conversations/${encodeURIComponent(conversation_id)}/citations/${encodeURIComponent(citation_id)}`,
  );
}

export async function streamConversationTurnApi(
  conversation_id: string,
  question: string,
  signal: AbortSignal,
  onEvent: (frame: SseFrame) => void,
): Promise<void> {
  return streamConversationMessage(conversation_id, question, signal, onEvent);
}
