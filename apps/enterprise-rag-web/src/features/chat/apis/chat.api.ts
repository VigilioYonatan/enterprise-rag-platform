import type { AnswerResponseDto, SearchHitResponseDto } from '@enterprise-rag/contracts';
import { api, type SseFrame, streamAnswer } from '../../../services/api';

export async function searchHybridApi(
  knowledge_base_id: string,
  query: string,
  signal?: AbortSignal,
): Promise<SearchHitResponseDto[]> {
  return api<SearchHitResponseDto[]>('/retrieval/search', {
    method: 'POST',
    signal,
    body: JSON.stringify({
      knowledge_base_id,
      query: query.trim(),
    }),
  });
}

export async function askAnswerSyncApi(knowledge_base_id: string, query: string): Promise<AnswerResponseDto> {
  return api<AnswerResponseDto>('/retrieval/answer', {
    method: 'POST',
    body: JSON.stringify({
      knowledge_base_id,
      query: query.trim(),
    }),
  });
}

export async function streamAnswerChatApi(
  input: { knowledge_base_id: string; question: string },
  signal: AbortSignal,
  onEvent: (frame: SseFrame) => void,
): Promise<void> {
  return streamAnswer(input, signal, onEvent);
}
