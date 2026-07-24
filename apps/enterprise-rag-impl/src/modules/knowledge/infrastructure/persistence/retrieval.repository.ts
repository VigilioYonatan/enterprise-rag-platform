import { Injectable, NotFoundException } from '@nestjs/common';
import { env } from '../../../../config/env';
import { withActor } from '../../../../database/pool';
import { usage_events } from '../../../../database/schema';
import type { RetrievalRepositoryPort, SearchHit } from '../../application/ports/retrieval-repository.port';
import { SUPPORTED_EMBEDDING_DIMENSIONS } from '../../const/knowledge.const';

/** PostgreSQL adapter: both FTS and vector candidates run in actor-local transaction with RLS + ACL predicates. */
@Injectable()
export class PostgresRetrievalRepository implements RetrievalRepositoryPort {
  async search(
    actor_sub: string,
    knowledge_base_id: string,
    query: string,
    vector: number[] | null,
  ): Promise<SearchHit[]> {
    const startTime = Date.now();
    return withActor(actor_sub, async (db, client) => {
      const kbRow = await client.query<{ tenant_id: string }>(
        'SELECT tenant_id FROM knowledge_bases WHERE id = $1',
        [knowledge_base_id],
      );
      if (!kbRow.rowCount) {
        throw new NotFoundException('Knowledge base unavailable');
      }
      const tenantId = kbRow.rows[0].tenant_id;

      const lexical = await client.query<SearchHit>(
        `SELECT c.id AS chunk_id,
                c.document_version,
                d.id AS document_id,
                d.title,
                c.content,
                ts_rank(c.search_vector, websearch_to_tsquery('simple', $2)) AS score
         FROM document_chunks c
         JOIN documents d ON d.id = c.document_id AND d.tenant_id = c.tenant_id
         WHERE d.knowledge_base_id = $1
           AND d.status = 'ready'
           AND d.deleted_at IS NULL
           AND d.version = c.document_version
           AND can_read_document(c.document_id)
           AND c.search_vector @@ websearch_to_tsquery('simple', $2)
         ORDER BY score DESC, c.id
         LIMIT 20`,
        [knowledge_base_id, query],
      );

      let mergedHits: SearchHit[];
      if (!vector || !SUPPORTED_EMBEDDING_DIMENSIONS.has(vector.length)) {
        mergedHits = lexical.rows.slice(0, 12);
      } else {
        const literal = `[${vector.map((coordinate) => Number(coordinate).toFixed(7)).join(',')}]`;
        const minSimilarity = env.MIN_VECTOR_SIMILARITY ?? 0.25;
        const semantic = await client.query<SearchHit>(
          `SELECT c.id AS chunk_id,
                  c.document_version,
                  d.id AS document_id,
                  d.title,
                  c.content,
                  (1 - (c.vector <=> $2::vector)) AS score
           FROM document_chunks c
           JOIN documents d ON d.id = c.document_id AND d.tenant_id = c.tenant_id
           WHERE d.knowledge_base_id = $1
             AND d.status = 'ready'
             AND d.deleted_at IS NULL
             AND d.version = c.document_version
             AND can_read_document(c.document_id)
             AND c.vector IS NOT NULL
             AND vector_dims(c.vector) = $3
             AND (1 - (c.vector <=> $2::vector)) >= $4
           ORDER BY c.vector <=> $2::vector, c.id
           LIMIT 20`,
          [knowledge_base_id, literal, vector.length, minSimilarity],
        );

        const ranked = new Map<string, { hit: SearchHit; score: number }>();
        for (const group of [lexical.rows, semantic.rows]) {
          group.forEach((hit: SearchHit, hitIndex: number) => {
            const prior = ranked.get(hit.chunk_id);
            ranked.set(hit.chunk_id, {
              hit,
              score: (prior?.score ?? 0) + 1 / (60 + hitIndex + 1),
            });
          });
        }
        mergedHits = [...ranked.values()]
          .sort((firstRanked, secondRanked) => secondRanked.score - firstRanked.score)
          .slice(0, 12)
          .map((rankedEntry) => ({ ...rankedEntry.hit, score: rankedEntry.score }));
      }

      // Record retrieval telemetry for FinOps/SLO observability without failing read path if sub-ms insert warns.
      await db
        .insert(usage_events)
        .values({
          tenant_id: tenantId,
          actor_sub,
          category: 'retrieval',
          model_name: vector ? env.OLLAMA_EMBED_MODEL : 'fts-lexical',
          latency_ms: Math.max(0, Date.now() - startTime),
        })
        .catch(() => {});

      return mergedHits;
    });
  }
}

export const PgRetrievalRepository = PostgresRetrievalRepository;
