import { describe, expect, it, vi } from 'vitest';

vi.mock('../../src/config/env', () => ({
  env: {
    EMBEDDINGS_ENABLED: 'true',
    OLLAMA_URL: 'http://localhost:11434',
    OLLAMA_EMBED_MODEL: 'qwen3-embedding:0.6b',
  },
}));

import type {
  EmbeddingPort,
  RerankerPort,
} from '../../src/modules/knowledge/application/ports/ai-providers.port';
import type { RetrievalRepositoryPort } from '../../src/modules/knowledge/application/ports/retrieval-repository.port';
import { RetrievalService } from '../../src/modules/knowledge/application/services/retrieval.service';

describe('retrieval application service', () => {
  it('passes actor identity and scoped knowledge base to the adapter', async () => {
    const repository = { search: vi.fn().mockResolvedValue([]) } as unknown as RetrievalRepositoryPort;
    const embeddingPort: EmbeddingPort = {
      embedQuery: vi.fn().mockResolvedValue([0.1, 0.2, 0.3]),
    };
    const service = new RetrievalService(repository, embeddingPort);
    const result = await service.search('authenticated-sub', 'kb-1', 'question');
    expect(embeddingPort.embedQuery).toHaveBeenCalledWith('question');
    expect(repository.search).toHaveBeenCalledWith('authenticated-sub', 'kb-1', 'question', [0.1, 0.2, 0.3]);
    expect(result).toEqual([]);
  });

  it('delegates to reranker port when candidates exist', async () => {
    const hits = [
      { chunk_id: 'c1', document_id: 'd1', document_version: 1, title: 'T1', content: 'C1', score: 0.8 },
      { chunk_id: 'c2', document_id: 'd2', document_version: 1, title: 'T2', content: 'C2', score: 0.7 },
    ];
    const repository = { search: vi.fn().mockResolvedValue(hits) } as unknown as RetrievalRepositoryPort;
    const embeddingPort: EmbeddingPort = {
      embedQuery: vi.fn().mockResolvedValue([0.5]),
    };
    const rerankerPort: RerankerPort = {
      rerank: vi.fn().mockResolvedValue([hits[1], hits[0]]),
    };

    const service = new RetrievalService(repository, embeddingPort, rerankerPort);
    const reranked = await service.search('sub', 'kb', 'query');
    expect(rerankerPort.rerank).toHaveBeenCalledWith('query', hits, 6);
    expect(reranked[0].chunk_id).toBe('c2');
  });
});
