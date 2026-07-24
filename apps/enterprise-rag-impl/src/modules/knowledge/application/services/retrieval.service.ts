import { Inject, Injectable, Optional } from '@nestjs/common';
import { env } from '../../../../config/env';
import { OllamaEmbeddingAdapter } from '../../infrastructure/ai/ollama-ai.adapter';
import {
  EMBEDDING_PORT,
  type EmbeddingPort,
  RERANKER_PORT,
  type RerankerPort,
} from '../ports/ai-providers.port';
import {
  RETRIEVAL_REPOSITORY,
  type RetrievalRepositoryPort,
  type SearchHit,
} from '../ports/retrieval-repository.port';

export type { SearchHit } from '../ports/retrieval-repository.port';

/** Application service coordinates embedding + authorized SQL retrieval + optional reranking. */
@Injectable()
export class RetrievalService {
  private readonly embeddingPort: EmbeddingPort;

  constructor(
    @Inject(RETRIEVAL_REPOSITORY) private readonly repository: RetrievalRepositoryPort,
    @Optional() @Inject(EMBEDDING_PORT) embeddingPort?: EmbeddingPort,
    @Optional() @Inject(RERANKER_PORT) private readonly rerankerPort?: RerankerPort,
  ) {
    this.embeddingPort = embeddingPort ?? new OllamaEmbeddingAdapter();
  }

  async search(actor_sub: string, kb_id: string, query: string): Promise<SearchHit[]> {
    let vector: number[] | null = null;
    if (env.EMBEDDINGS_ENABLED) {
      vector = await this.embeddingPort.embedQuery(query).catch(() => null);
    }
    const candidates = await this.repository.search(actor_sub, kb_id, query, vector);
    if (this.rerankerPort && candidates.length > 0) {
      return this.rerankerPort.rerank(query, candidates, 6);
    }
    return candidates.slice(0, 6);
  }
}
