import { Inject, Injectable, Optional } from '@nestjs/common';
import type { PaginationWindow } from '~/shared/types/pagination.type';
import { AnswerService } from '../../../knowledge/application/services/answer.service';
import { PostgresConversationsRepository } from '../../infrastructure/persistence/conversations.repository';
import {
  CONVERSATIONS_REPOSITORY,
  type ConversationsRepositoryPort,
} from '../ports/conversations-repository.port';

@Injectable()
export class ConversationsService {
  private readonly repository: ConversationsRepositoryPort;

  constructor(
    @Inject(AnswerService) private readonly answerService: AnswerService,
    @Optional() @Inject(CONVERSATIONS_REPOSITORY) repository?: ConversationsRepositoryPort,
  ) {
    this.repository = repository ?? new PostgresConversationsRepository();
  }

  listConversations(actor_sub: string, knowledge_base_id?: string, pagination?: PaginationWindow) {
    return this.repository.list(actor_sub, knowledge_base_id, pagination);
  }

  /** Backward compatibility alias */
  list(actor_sub: string, knowledge_base_id?: string, pagination?: PaginationWindow) {
    return this.listConversations(actor_sub, knowledge_base_id, pagination);
  }

  createConversation(actor_sub: string, knowledge_base_id: string, title: string) {
    return this.repository.create(actor_sub, knowledge_base_id, title);
  }

  /** Backward compatibility alias */
  create(actor_sub: string, knowledge_base_id: string, title: string) {
    return this.createConversation(actor_sub, knowledge_base_id, title);
  }

  getConversation(actor_sub: string, conversation_id: string) {
    return this.repository.get(actor_sub, conversation_id);
  }

  /** Backward compatibility alias */
  get(actor_sub: string, conversation_id: string) {
    return this.getConversation(actor_sub, conversation_id);
  }

  async askConversationQuestion(
    actor_sub: string,
    conversation_id: string,
    question: string,
    options?: {
      signal?: AbortSignal;
      onPhase?: (phase: 'authorized' | 'retrieval' | 'generation' | 'authorization') => void;
    },
  ) {
    const conversation = await this.repository.getKnowledgeBaseForConversation(actor_sub, conversation_id);
    const generated = await this.answerService.answerWithEvidence(
      actor_sub,
      conversation.knowledge_base_id,
      question,
      options,
    );
    return this.repository.persistTurn(
      actor_sub,
      conversation_id,
      question,
      generated.result,
      generated.evidence,
    );
  }

  /** Backward compatibility alias */
  ask(
    actor_sub: string,
    conversation_id: string,
    question: string,
    options?: {
      signal?: AbortSignal;
      onPhase?: (phase: 'authorized' | 'retrieval' | 'generation' | 'authorization') => void;
    },
  ) {
    return this.askConversationQuestion(actor_sub, conversation_id, question, options);
  }

  deleteConversation(actor_sub: string, conversation_id: string) {
    return this.repository.deleteConversation(actor_sub, conversation_id);
  }

  /** Backward compatibility alias */
  delete(actor_sub: string, conversation_id: string) {
    return this.deleteConversation(actor_sub, conversation_id);
  }

  resolveConversationCitation(actor_sub: string, conversation_id: string, citation_id: string) {
    return this.repository.resolveCitation(actor_sub, conversation_id, citation_id);
  }

  /** Backward compatibility alias */
  resolveCitation(actor_sub: string, conversation_id: string, citation_id: string) {
    return this.resolveConversationCitation(actor_sub, conversation_id, citation_id);
  }
}
