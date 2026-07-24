import { Module } from '@nestjs/common';
import {
  ANSWER_BUDGET_PORT,
  EMBEDDING_PORT,
  LLM_GENERATOR_PORT,
  RERANKER_PORT,
} from './application/ports/ai-providers.port';
import { KNOWLEDGE_REPOSITORY } from './application/ports/knowledge-repository.port';
import { RETRIEVAL_REPOSITORY } from './application/ports/retrieval-repository.port';
import { AnswerService } from './application/services/answer.service';
import { KnowledgeService } from './application/services/knowledge.service';
import { RetrievalService } from './application/services/retrieval.service';
import {
  HttpCrossEncoderRerankerAdapter,
  OllamaEmbeddingAdapter,
  OllamaLlmGeneratorAdapter,
} from './infrastructure/ai/ollama-ai.adapter';
import { PostgresAnswerBudgetRepository } from './infrastructure/persistence/answer-budget.repository';
import { PostgresKnowledgeRepository } from './infrastructure/persistence/knowledge.repository';
import { PostgresRetrievalRepository } from './infrastructure/persistence/retrieval.repository';
import { KnowledgeController } from './presentation/http/controllers/knowledge.controller';

@Module({
  controllers: [KnowledgeController],
  providers: [
    KnowledgeService,
    { provide: KNOWLEDGE_REPOSITORY, useClass: PostgresKnowledgeRepository },
    RetrievalService,
    { provide: RETRIEVAL_REPOSITORY, useClass: PostgresRetrievalRepository },
    { provide: EMBEDDING_PORT, useClass: OllamaEmbeddingAdapter },
    { provide: RERANKER_PORT, useClass: HttpCrossEncoderRerankerAdapter },
    { provide: LLM_GENERATOR_PORT, useClass: OllamaLlmGeneratorAdapter },
    { provide: ANSWER_BUDGET_PORT, useClass: PostgresAnswerBudgetRepository },
    AnswerService,
  ],
  exports: [RetrievalService, AnswerService],
})
export class KnowledgeModule {}
