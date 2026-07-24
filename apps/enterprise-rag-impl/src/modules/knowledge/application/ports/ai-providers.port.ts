import type { SearchHit } from './retrieval-repository.port';

export interface EmbeddingPort {
  embedQuery(text: string): Promise<number[]>;
}

export interface RerankerPort {
  rerank(query: string, candidates: SearchHit[], topK: number): Promise<SearchHit[]>;
}

export interface LlmGenerationOutput {
  response: string;
  inputTokens: number;
  outputTokens: number;
}

export interface LlmGeneratorPort {
  generate(prompt: string, signal?: AbortSignal): Promise<LlmGenerationOutput>;
}

export interface AnswerBudgetPort {
  reserveBudget(actor_sub: string, kb_id: string): Promise<string>;
  finalizeUsage(
    actor_sub: string,
    usage_id: string,
    input_tokens: number,
    output_tokens: number,
    latency_ms: number,
  ): Promise<void>;
  allEvidenceStillAuthorized(actor_sub: string, hits: SearchHit[]): Promise<boolean>;
}

export const EMBEDDING_PORT = Symbol('EMBEDDING_PORT');
export const RERANKER_PORT = Symbol('RERANKER_PORT');
export const LLM_GENERATOR_PORT = Symbol('LLM_GENERATOR_PORT');
export const ANSWER_BUDGET_PORT = Symbol('ANSWER_BUDGET_PORT');
