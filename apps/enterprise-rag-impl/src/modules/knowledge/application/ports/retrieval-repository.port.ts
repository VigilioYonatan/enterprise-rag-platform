/** Persistence port owned by the retrieval use case. All candidate queries enforce ACL in SQL. */
export interface SearchHit {
  chunk_id: string;
  document_id: string;
  document_version: number;
  title: string;
  content: string;
  score: number;
}
export interface RetrievalRepositoryPort {
  search(actor_sub: string, kb_id: string, query: string, vector: number[] | null): Promise<SearchHit[]>;
}
export const RETRIEVAL_REPOSITORY = Symbol('RETRIEVAL_REPOSITORY');
