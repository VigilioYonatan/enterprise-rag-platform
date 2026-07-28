import type {
  ConversationDetailResponseDto,
  ConversationSummaryResponseDto,
  ConversationTurnResponseDto,
  ResolvedCitationResponseDto,
} from '@/conversations/presentation/http/dto/conversations.dto';
import type { AnswerEvidence } from '@/knowledge/application/services/answer.service';
import type { AnswerResultSchema } from '@/knowledge/domain/schemas/answer-result.schema';
import type { CountedRows, PaginationWindow } from '~/shared/types/pagination.type';

export interface ConversationsRepositoryPort {
  list(
    actor_sub: string,
    kb_id: string | undefined,
    pagination?: PaginationWindow,
  ): Promise<CountedRows<ConversationSummaryResponseDto>>;
  create(actor_sub: string, kb_id: string, title: string): Promise<ConversationSummaryResponseDto>;
  get(actor_sub: string, conversation_id: string): Promise<ConversationDetailResponseDto>;
  getKnowledgeBaseForConversation(
    actor_sub: string,
    conversation_id: string,
  ): Promise<{ knowledge_base_id: string }>;
  persistTurn(
    actor_sub: string,
    conversation_id: string,
    question: string,
    result: AnswerResultSchema,
    evidence: AnswerEvidence[],
  ): Promise<ConversationTurnResponseDto>;
  deleteConversation(actor_sub: string, conversation_id: string): Promise<{ deleted: boolean }>;
  resolveCitation(
    actor_sub: string,
    conversation_id: string,
    citation_id: string,
  ): Promise<ResolvedCitationResponseDto>;
}

export const CONVERSATIONS_REPOSITORY = Symbol('CONVERSATIONS_REPOSITORY');
