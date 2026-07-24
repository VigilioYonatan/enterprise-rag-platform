import { HttpException, HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { env } from '../../../../config/env';
import { withActor } from '../../../../database/pool';
import type { AnswerBudgetPort } from '../../application/ports/ai-providers.port';
import type { SearchHit } from '../../application/ports/retrieval-repository.port';

@Injectable()
export class PostgresAnswerBudgetRepository implements AnswerBudgetPort {
  async reserveBudget(actor_sub: string, knowledge_base_id: string): Promise<string> {
    const reservation = (20_000 * env.LLM_INPUT_USD_PER_MILLION + 700 * env.LLM_OUTPUT_USD_PER_MILLION) / 1e6;
    try {
      return await withActor(actor_sub, async (_db, client) => {
        const row = await client.query<{ id: string }>(
          'SELECT reserve_tenant_answer_budget($1::uuid, $2::text, $3::numeric) AS id',
          [knowledge_base_id, env.OLLAMA_GENERATION_MODEL, reservation],
        );
        if (!row.rowCount || !row.rows[0].id) {
          throw new NotFoundException('Knowledge base not found');
        }
        return row.rows[0].id;
      });
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      if (typeof error === 'object' && error !== null && 'code' in error) {
        const pgCode = String(error.code ?? '');
        if (pgCode === 'P0002') {
          throw new NotFoundException('Knowledge base not found');
        }
        if (pgCode === 'P0029') {
          throw new HttpException(
            {
              code: 'BUDGET_EXHAUSTED',
              message: error instanceof Error ? error.message : 'Daily tenant answer budget exhausted',
            },
            HttpStatus.TOO_MANY_REQUESTS,
          );
        }
      }
      throw error;
    }
  }

  async finalizeUsage(
    actor_sub: string,
    usage_id: string,
    input_tokens: number,
    output_tokens: number,
    latency_ms: number,
  ): Promise<void> {
    const cost =
      (input_tokens * env.LLM_INPUT_USD_PER_MILLION + output_tokens * env.LLM_OUTPUT_USD_PER_MILLION) / 1e6;
    await withActor(actor_sub, async (_db, client) => {
      await client.query(
        'SELECT finalize_tenant_answer_usage($1::uuid, $2::int, $3::int, $4::int, $5::numeric)',
        [usage_id, input_tokens, output_tokens, latency_ms, cost],
      );
    }).catch(() => {});
  }

  async allEvidenceStillAuthorized(actor_sub: string, hits: SearchHit[]): Promise<boolean> {
    if (hits.length === 0) {
      return true;
    }
    return withActor(actor_sub, async (_db, client) => {
      const chunkIds = hits.map((hit) => hit.chunk_id);
      const docIds = hits.map((hit) => hit.document_id);
      const versions = hits.map((hit) => hit.document_version);
      const result = await client.query<{ matched: number }>(
        `WITH expected AS (
           SELECT * FROM unnest($1::uuid[], $2::uuid[], $3::int[]) AS t(chunk_id, document_id, doc_version)
         )
         SELECT count(*)::int AS matched
         FROM expected e
         JOIN document_chunks c ON c.id = e.chunk_id
           AND c.document_id = e.document_id
           AND c.document_version = e.doc_version
         JOIN documents d ON d.id = c.document_id
           AND d.version = e.doc_version
           AND d.deleted_at IS NULL
         WHERE can_read_document(c.document_id)`,
        [chunkIds, docIds, versions],
      );
      return (result.rows[0]?.matched ?? 0) === hits.length;
    });
  }
}

export const PgAnswerBudgetRepository = PostgresAnswerBudgetRepository;
