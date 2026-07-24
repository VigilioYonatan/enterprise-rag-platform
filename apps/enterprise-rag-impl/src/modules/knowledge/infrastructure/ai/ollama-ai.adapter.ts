import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { env } from '../../../../config/env';
import type {
  EmbeddingPort,
  LlmGenerationOutput,
  LlmGeneratorPort,
  RerankerPort,
} from '../../application/ports/ai-providers.port';
import type { SearchHit } from '../../application/ports/retrieval-repository.port';

const ollamaEmbedResponseDto = z.object({
  embeddings: z.array(z.array(z.number().finite())).min(1),
});

const sidecarRerankResponseDto = z.object({
  results: z.array(
    z.object({
      chunk_id: z.string().min(1),
      score: z.number().finite(),
    }),
  ),
});

@Injectable()
export class OllamaEmbeddingAdapter implements EmbeddingPort {
  async embedQuery(text: string): Promise<number[]> {
    const response = await fetch(`${env.OLLAMA_URL}/api/embed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: env.OLLAMA_EMBED_MODEL, input: [text] }),
      signal: AbortSignal.timeout(12_000),
    });
    if (!response.ok) {
      throw new Error(`Embedding provider HTTP ${response.status}`);
    }
    const raw: unknown = await response.json();
    const parsed = ollamaEmbedResponseDto.safeParse(raw);
    if (!parsed.success) {
      throw new Error('Invalid embedding response');
    }
    const first = parsed.data.embeddings[0];
    const expectedDim = env.EMBEDDING_DIMENSIONS || 1024;
    if (first.length !== expectedDim) {
      throw new Error(`Embedding dimensionality mismatch (expected ${expectedDim}, got ${first.length})`);
    }
    return first;
  }
}

/**
 * Optional external CrossEncoder sidecar adapter (e.g., Sentence-Transformers Qwen/Qwen3-Reranker-0.6B).
 * Never assumes a non-existent Ollama `/api/rerank` endpoint; validates candidate IDs strictly
 * against pre-authorized SQL RRF results and falls back safely if disabled or unavailable.
 */
@Injectable()
export class HttpCrossEncoderRerankerAdapter implements RerankerPort {
  async rerank(query: string, candidates: SearchHit[], topK: number): Promise<SearchHit[]> {
    if (!env.RERANKER_ENABLED || !env.RERANKER_URL || candidates.length <= 1) {
      return candidates.slice(0, topK);
    }
    const bounded = candidates.slice(0, 40);
    const byId = new Map<string, SearchHit>();
    for (const candidate of bounded) {
      if (!byId.has(candidate.chunk_id)) {
        byId.set(candidate.chunk_id, candidate);
      }
    }
    const deduped = [...byId.values()];
    if (deduped.length <= 1) {
      return deduped.slice(0, topK);
    }

    try {
      const response = await fetch(`${env.RERANKER_URL.replace(/\/$/, '')}/v1/rerank`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: env.RERANKER_MODEL,
          query,
          candidates: deduped.map((c) => ({
            chunk_id: c.chunk_id,
            text: c.content.slice(0, 1200),
          })),
        }),
        signal: AbortSignal.timeout(10_000),
      });
      if (!response.ok) {
        return deduped.slice(0, topK);
      }
      const raw: unknown = await response.json();
      const parsed = sidecarRerankResponseDto.safeParse(raw);
      if (!parsed.success) {
        return deduped.slice(0, topK);
      }
      const seen = new Set<string>();
      const reranked: SearchHit[] = [];
      for (const item of parsed.data.results) {
        const hit = byId.get(item.chunk_id);
        if (!hit || seen.has(item.chunk_id)) {
          // Reject any hallucinated/unauthorized chunk_id or duplicate from external reranker
          return deduped.slice(0, topK);
        }
        seen.add(item.chunk_id);
        reranked.push({ ...hit, score: item.score });
      }
      if (seen.size !== byId.size) {
        return deduped.slice(0, topK);
      }
      return reranked.sort((a, b) => b.score - a.score).slice(0, topK);
    } catch {
      return deduped.slice(0, topK);
    }
  }
}

@Injectable()
export class OllamaLlmGeneratorAdapter implements LlmGeneratorPort {
  async generate(prompt: string, signal?: AbortSignal): Promise<LlmGenerationOutput> {
    const combinedSignal = signal
      ? AbortSignal.any([AbortSignal.timeout(60_000), signal])
      : AbortSignal.timeout(60_000);
    const response = await fetch(`${env.OLLAMA_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: env.OLLAMA_GENERATION_MODEL,
        prompt,
        stream: false,
        options: { temperature: 0, num_predict: 700 },
      }),
      signal: combinedSignal,
    });
    if (!response.ok) {
      throw new Error(`Model unavailable (${response.status})`);
    }
    const data: unknown = await response.json();
    if (
      typeof data !== 'object' ||
      data === null ||
      !('response' in data) ||
      typeof data.response !== 'string'
    ) {
      throw new Error('Invalid model response');
    }
    const inputTokens = Number('prompt_eval_count' in data ? data.prompt_eval_count : 0) || 0;
    const outputTokens = Number('eval_count' in data ? data.eval_count : 0) || 0;
    return {
      response: data.response,
      inputTokens,
      outputTokens,
    };
  }
}
