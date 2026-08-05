import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, desc, eq, inArray, isNull, sql } from 'drizzle-orm';
import { env } from '../../../../config/env';
import { withActor } from '../../../../database/pool';
import {
  audit_events,
  documents,
  evaluation_cases,
  evaluation_datasets,
  evaluation_runs,
  knowledge_bases,
  usage_events,
} from '../../../../database/schema';
import type { CountedRows, PaginationWindow } from '../../../../shared/types/pagination.type';
import type {
  ComputedCaseMetric,
  EvaluationRunCaseSample,
  EvaluationsRepositoryPort,
} from '../../application/ports/evaluations-repository.port';
import type {
  CaseResponseDto,
  DatasetResponseDto,
  RunDetailResponseDto,
  RunSummaryResponseDto,
} from '../../presentation/http/dto/evaluations.dto';

function toNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toRunStatus(value: unknown): 'running' | 'completed' | 'failed' {
  if (value === 'completed' || value === 'failed') return value;
  return 'running';
}

function normalizeRunRow(row?: Record<string, unknown> | null): RunSummaryResponseDto {
  const safeRow = row ?? {};
  return {
    id: String(safeRow.id ?? ''),
    dataset_id: String(safeRow.dataset_id ?? ''),
    dataset_name: typeof safeRow.dataset_name === 'string' ? safeRow.dataset_name : undefined,
    status: toRunStatus(safeRow.status),
    recall_at_6: toNullableNumber(safeRow.recall_at_6),
    mrr_at_6: toNullableNumber(safeRow.mrr_at_6),
    ndcg_at_6: toNullableNumber(safeRow.ndcg_at_6),
    precision_at_6: toNullableNumber(safeRow.precision_at_6),
    abstention_pass_rate: toNullableNumber(safeRow.abstention_pass_rate),
    dataset_revision: typeof safeRow.dataset_revision === 'number' ? safeRow.dataset_revision : 0,
    case_count: Number(safeRow.case_count) || 0,
    started_at: safeRow.started_at instanceof Date ? safeRow.started_at : String(safeRow.started_at ?? ''),
    completed_at:
      safeRow.completed_at instanceof Date
        ? safeRow.completed_at
        : safeRow.completed_at
          ? String(safeRow.completed_at)
          : null,
  };
}

@Injectable()
export class PostgresEvaluationsRepository implements EvaluationsRepositoryPort {
  async listDatasets(
    actor_sub: string,
    tenant_id: string,
    pagination: PaginationWindow = { limit: 25, offset: 0 },
  ): Promise<CountedRows<DatasetResponseDto>> {
    return withActor(actor_sub, async (db) => {
      const [{ count }] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(evaluation_datasets)
        .where(eq(evaluation_datasets.tenant_id, tenant_id));
      const results = await db
        .select({
          id: evaluation_datasets.id,
          tenant_id: evaluation_datasets.tenant_id,
          knowledge_base_id: evaluation_datasets.knowledge_base_id,
          name: evaluation_datasets.name,
          revision: evaluation_datasets.revision,
          created_at: evaluation_datasets.created_at,
        })
        .from(evaluation_datasets)
        .where(eq(evaluation_datasets.tenant_id, tenant_id))
        .orderBy(desc(evaluation_datasets.created_at), asc(evaluation_datasets.id))
        .limit(pagination.limit)
        .offset(pagination.offset);
      return { count: count ?? 0, results };
    });
  }

  async datasets(
    actor_sub: string,
    tenant_id: string,
    pagination: PaginationWindow = { limit: 25, offset: 0 },
  ): Promise<CountedRows<DatasetResponseDto>> {
    return this.listDatasets(actor_sub, tenant_id, pagination);
  }

  async createDataset(
    actor_sub: string,
    tenant_id: string,
    knowledge_base_id: string,
    name: string,
  ): Promise<DatasetResponseDto> {
    return withActor(actor_sub, async (db) => {
      const [knowledgeBaseRow] = await db
        .select({ id: knowledge_bases.id })
        .from(knowledge_bases)
        .where(and(eq(knowledge_bases.id, knowledge_base_id), eq(knowledge_bases.tenant_id, tenant_id)));
      if (!knowledgeBaseRow) {
        throw new NotFoundException('Knowledge base not accessible');
      }
      const [createdDataset] = await db
        .insert(evaluation_datasets)
        .values({
          tenant_id,
          knowledge_base_id,
          created_by_sub: actor_sub,
          name,
        })
        .returning({
          id: evaluation_datasets.id,
          tenant_id: evaluation_datasets.tenant_id,
          knowledge_base_id: evaluation_datasets.knowledge_base_id,
          name: evaluation_datasets.name,
          revision: evaluation_datasets.revision,
          created_at: evaluation_datasets.created_at,
        });
      return createdDataset;
    });
  }

  async deleteDataset(actor_sub: string, dataset_id: string): Promise<{ deleted: boolean }> {
    return withActor(actor_sub, async (db, client) => {
      const [datasetRow] = await db
        .select({ tenant_id: evaluation_datasets.tenant_id })
        .from(evaluation_datasets)
        .where(eq(evaluation_datasets.id, dataset_id))
        .for('update');
      if (!datasetRow) {
        throw new NotFoundException('Dataset unavailable');
      }
      const check = await client.query<{ ok: boolean }>('SELECT is_tenant_manager($1::uuid) AS ok', [
        datasetRow.tenant_id,
      ]);
      const ok = check.rows[0]?.ok ?? false;
      if (!ok) {
        throw new ForbiddenException('Manager role required to delete evaluation dataset');
      }
      await db.delete(evaluation_datasets).where(eq(evaluation_datasets.id, dataset_id));
      await db.insert(audit_events).values({
        tenant_id: datasetRow.tenant_id,
        actor_sub,
        action: 'evaluation_dataset.deleted',
        target_type: 'evaluation_dataset',
        target_id: dataset_id,
      });
      return { deleted: true };
    });
  }

  async listDatasetCases(
    actor_sub: string,
    dataset_id: string,
    pagination: PaginationWindow = { limit: 25, offset: 0 },
  ): Promise<CountedRows<CaseResponseDto>> {
    return withActor(actor_sub, async (db, client) => {
      const [datasetRow] = await db
        .select({ id: evaluation_datasets.id })
        .from(evaluation_datasets)
        .where(eq(evaluation_datasets.id, dataset_id));
      if (!datasetRow) {
        throw new NotFoundException('Dataset unavailable');
      }
      const [{ count }] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(evaluation_cases)
        .where(eq(evaluation_cases.dataset_id, dataset_id));
      const rows = await client.query<CaseResponseDto>(
        `SELECT id, question, expected_document_ids, expected_abstention
         FROM evaluation_cases
         WHERE dataset_id = $1
         ORDER BY created_at ASC, id ASC
         LIMIT $2 OFFSET $3`,
        [dataset_id, pagination.limit, pagination.offset],
      );
      return { count: count ?? 0, results: rows.rows };
    });
  }

  async cases(
    actor_sub: string,
    dataset_id: string,
    pagination: PaginationWindow = { limit: 25, offset: 0 },
  ): Promise<CountedRows<CaseResponseDto>> {
    return this.listDatasetCases(actor_sub, dataset_id, pagination);
  }

  async addDatasetCase(
    actor_sub: string,
    dataset_id: string,
    question: string,
    expected: string[],
    abstain = false,
  ): Promise<CaseResponseDto> {
    return withActor(actor_sub, async (db, _client) => {
      const [datasetRow] = await db
        .select({ knowledge_base_id: evaluation_datasets.knowledge_base_id })
        .from(evaluation_datasets)
        .where(eq(evaluation_datasets.id, dataset_id))
        .for('update');
      if (!datasetRow) {
        throw new NotFoundException('Dataset unavailable');
      }
      const unique = [...new Set(expected)];
      if (abstain === unique.length > 0) {
        throw new BadRequestException('Invalid abstention case');
      }
      if (unique.length > 0) {
        const valid = await db
          .select({ id: documents.id })
          .from(documents)
          .where(
            and(
              inArray(documents.id, unique),
              eq(documents.knowledge_base_id, datasetRow.knowledge_base_id),
              eq(documents.status, 'ready'),
              isNull(documents.deleted_at),
            ),
          );
        if (valid.length !== unique.length) {
          throw new BadRequestException('Ground truth must contain accessible, ready documents');
        }
      }
      const [insertedCase] = await db
        .insert(evaluation_cases)
        .values({
          dataset_id,
          question,
          expected_document_ids: unique,
          expected_abstention: abstain,
        })
        .returning({
          id: evaluation_cases.id,
          question: evaluation_cases.question,
          expected_document_ids: evaluation_cases.expected_document_ids,
          expected_abstention: evaluation_cases.expected_abstention,
        });
      await db
        .update(evaluation_datasets)
        .set({ revision: sql`${evaluation_datasets.revision} + 1` })
        .where(eq(evaluation_datasets.id, dataset_id));
      return {
        id: String(insertedCase?.id ?? ''),
        question: insertedCase?.question ?? question,
        expected_document_ids: insertedCase?.expected_document_ids ?? unique,
        expected_abstention: insertedCase?.expected_abstention ?? abstain,
      };
    });
  }

  async addCase(
    actor_sub: string,
    dataset_id: string,
    question: string,
    expected: string[],
    abstain = false,
  ): Promise<CaseResponseDto> {
    return this.addDatasetCase(actor_sub, dataset_id, question, expected, abstain);
  }

  async deleteDatasetCase(
    actor_sub: string,
    dataset_id: string,
    case_id: string,
  ): Promise<{ deleted: boolean }> {
    return withActor(actor_sub, async (db, client) => {
      const [datasetRow] = await db
        .select({ tenant_id: evaluation_datasets.tenant_id })
        .from(evaluation_datasets)
        .where(eq(evaluation_datasets.id, dataset_id))
        .for('update');
      if (!datasetRow) {
        throw new NotFoundException('Dataset unavailable');
      }
      const check = await client.query<{ ok: boolean }>('SELECT is_tenant_manager($1::uuid) AS ok', [
        datasetRow.tenant_id,
      ]);
      const ok = check.rows[0]?.ok ?? false;
      if (!ok) {
        throw new ForbiddenException('Manager role required to delete evaluation case');
      }
      const [deleted] = await db
        .delete(evaluation_cases)
        .where(and(eq(evaluation_cases.id, case_id), eq(evaluation_cases.dataset_id, dataset_id)))
        .returning({ id: evaluation_cases.id });
      if (!deleted) {
        throw new NotFoundException('Evaluation case not found');
      }
      await db
        .update(evaluation_datasets)
        .set({ revision: sql`${evaluation_datasets.revision} + 1` })
        .where(eq(evaluation_datasets.id, dataset_id));
      return { deleted: true };
    });
  }

  async deleteCase(actor_sub: string, dataset_id: string, case_id: string): Promise<{ deleted: boolean }> {
    return this.deleteDatasetCase(actor_sub, dataset_id, case_id);
  }

  async listEvaluationRuns(
    actor_sub: string,
    tenant_id: string,
    pagination: PaginationWindow = { limit: 25, offset: 0 },
  ): Promise<CountedRows<RunSummaryResponseDto>> {
    return withActor(actor_sub, async (db) => {
      const [{ count }] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(evaluation_runs)
        .innerJoin(evaluation_datasets, eq(evaluation_datasets.id, evaluation_runs.dataset_id))
        .where(eq(evaluation_datasets.tenant_id, tenant_id));
      const rows = await db
        .select({
          id: evaluation_runs.id,
          dataset_id: evaluation_runs.dataset_id,
          dataset_name: evaluation_datasets.name,
          status: evaluation_runs.status,
          recall_at_6: evaluation_runs.recall_at_6,
          mrr_at_6: evaluation_runs.mrr_at_6,
          ndcg_at_6: evaluation_runs.ndcg_at_6,
          precision_at_6: evaluation_runs.precision_at_6,
          abstention_pass_rate: evaluation_runs.abstention_pass_rate,
          dataset_revision: evaluation_runs.dataset_revision,
          case_count: evaluation_runs.case_count,
          started_at: evaluation_runs.started_at,
          completed_at: evaluation_runs.completed_at,
        })
        .from(evaluation_runs)
        .innerJoin(evaluation_datasets, eq(evaluation_datasets.id, evaluation_runs.dataset_id))
        .where(eq(evaluation_datasets.tenant_id, tenant_id))
        .orderBy(desc(evaluation_runs.started_at), asc(evaluation_runs.id))
        .limit(pagination.limit)
        .offset(pagination.offset);
      return {
        count: count ?? 0,
        results: rows.map((runRow) => normalizeRunRow(runRow)),
      };
    });
  }

  async runs(
    actor_sub: string,
    tenant_id: string,
    pagination: PaginationWindow = { limit: 25, offset: 0 },
  ): Promise<CountedRows<RunSummaryResponseDto>> {
    return this.listEvaluationRuns(actor_sub, tenant_id, pagination);
  }

  async getEvaluationRunDetail(actor_sub: string, run_id: string): Promise<RunDetailResponseDto> {
    return withActor(actor_sub, async (db, client) => {
      const [run] = await db.select().from(evaluation_runs).where(eq(evaluation_runs.id, run_id));
      if (!run) {
        throw new NotFoundException('Run unavailable');
      }
      const results = await client.query(
        `SELECT case_id,
                rank_of_first_match,
                recall_at_6,
                ndcg_at_6,
                precision_at_6,
                abstention_pass,
                retrieved_document_ids
         FROM evaluation_results
         WHERE run_id = $1`,
        [run_id],
      );
      return {
        ...normalizeRunRow(run),
        results: results.rows.map((item) => ({
          case_id: String(item.case_id ?? ''),
          rank_of_first_match:
            item.rank_of_first_match === null || item.rank_of_first_match === undefined
              ? null
              : Number(item.rank_of_first_match),
          recall_at_6: Number(item.recall_at_6) || 0,
          ndcg_at_6: Number(item.ndcg_at_6) || 0,
          precision_at_6: Number(item.precision_at_6) || 0,
          abstention_pass:
            item.abstention_pass === null || item.abstention_pass === undefined
              ? null
              : Boolean(item.abstention_pass),
          retrieved_document_ids: Array.isArray(item.retrieved_document_ids)
            ? item.retrieved_document_ids
            : [],
        })),
      };
    });
  }

  async getRun(actor_sub: string, run_id: string): Promise<RunDetailResponseDto> {
    return this.getEvaluationRunDetail(actor_sub, run_id);
  }

  async startRun(
    actor_sub: string,
    dataset_id: string,
  ): Promise<{
    tenant_id: string;
    knowledge_base_id: string;
    kb: string;
    cases: EvaluationRunCaseSample[];
    run_id: string;
  }> {
    return withActor(actor_sub, async (db, client) => {
      const [datasetRow] = await db
        .select({
          tenant_id: evaluation_datasets.tenant_id,
          knowledge_base_id: evaluation_datasets.knowledge_base_id,
          revision: evaluation_datasets.revision,
        })
        .from(evaluation_datasets)
        .where(eq(evaluation_datasets.id, dataset_id));
      if (!datasetRow) {
        throw new NotFoundException('Dataset unavailable');
      }
      const casesResult = await client.query<EvaluationRunCaseSample>(
        `SELECT id, question, expected_document_ids, expected_abstention
         FROM evaluation_cases
         WHERE dataset_id = $1
         ORDER BY id
         LIMIT 50`,
        [dataset_id],
      );
      if (!casesResult.rowCount) {
        throw new BadRequestException('Add at least one evaluation case');
      }
      const [run] = await db
        .insert(evaluation_runs)
        .values({
          dataset_id,
          created_by_sub: actor_sub,
          dataset_revision: datasetRow.revision,
        })
        .returning({ id: evaluation_runs.id });
      return {
        tenant_id: datasetRow.tenant_id,
        knowledge_base_id: datasetRow.knowledge_base_id,
        kb: datasetRow.knowledge_base_id,
        cases: casesResult.rows,
        run_id: run.id,
      };
    });
  }

  async completeRun(
    actor_sub: string,
    tenant_id: string,
    run_id: string,
    results: ComputedCaseMetric[],
    summary: {
      recall: number | null;
      mrr: number | null;
      ndcg: number | null;
      precision: number | null;
      abstention: number | null;
      caseCount: number;
      latencyMs: number;
    },
  ): Promise<RunDetailResponseDto> {
    return withActor(actor_sub, async (db, client) => {
      for (const caseMetric of results) {
        await client.query(
          `INSERT INTO evaluation_results(
             run_id, case_id, rank_of_first_match, recall_at_6,
             retrieved_document_ids, ndcg_at_6, precision_at_6, abstention_pass
           ) VALUES($1, $2, $3, $4, $5::uuid[], $6, $7, $8)`,
          [
            run_id,
            caseMetric.case_id,
            caseMetric.rank_of_first_match,
            caseMetric.recall_at_6,
            caseMetric.docs,
            caseMetric.ndcg_at_6,
            caseMetric.precision_at_6,
            caseMetric.abstention_pass,
          ],
        );
      }
      await db
        .insert(usage_events)
        .values({
          tenant_id,
          actor_sub,
          category: 'evaluation',
          model_name: env.OLLAMA_EMBED_MODEL,
          latency_ms: summary.latencyMs,
        })
        .catch(() => {});

      const [finalRecord] = await db
        .update(evaluation_runs)
        .set({
          status: 'completed',
          recall_at_6: summary.recall !== null ? String(summary.recall) : null,
          mrr_at_6: summary.mrr !== null ? String(summary.mrr) : null,
          case_count: summary.caseCount,
          ndcg_at_6: summary.ndcg !== null ? String(summary.ndcg) : null,
          precision_at_6: summary.precision !== null ? String(summary.precision) : null,
          abstention_pass_rate: summary.abstention !== null ? String(summary.abstention) : null,
          completed_at: new Date(),
        })
        .where(eq(evaluation_runs.id, run_id))
        .returning({
          id: evaluation_runs.id,
          dataset_id: evaluation_runs.dataset_id,
          status: evaluation_runs.status,
          recall_at_6: evaluation_runs.recall_at_6,
          mrr_at_6: evaluation_runs.mrr_at_6,
          ndcg_at_6: evaluation_runs.ndcg_at_6,
          precision_at_6: evaluation_runs.precision_at_6,
          abstention_pass_rate: evaluation_runs.abstention_pass_rate,
          dataset_revision: evaluation_runs.dataset_revision,
          case_count: evaluation_runs.case_count,
          started_at: evaluation_runs.started_at,
          completed_at: evaluation_runs.completed_at,
        });
      const runSummary = normalizeRunRow(finalRecord);
      return {
        ...runSummary,
        results: results.map((caseMetric) => ({
          case_id: caseMetric.case_id,
          rank_of_first_match: caseMetric.rank_of_first_match,
          recall_at_6: caseMetric.recall_at_6,
          ndcg_at_6: caseMetric.ndcg_at_6,
          precision_at_6: caseMetric.precision_at_6,
          abstention_pass: caseMetric.abstention_pass,
          retrieved_document_ids: caseMetric.docs,
        })),
      };
    });
  }

  async failRun(actor_sub: string, run_id: string): Promise<void> {
    await withActor(actor_sub, async (db) => {
      await db
        .update(evaluation_runs)
        .set({ status: 'failed', error_code: 'EVALUATION_FAILED', completed_at: new Date() })
        .where(eq(evaluation_runs.id, run_id));
    }).catch(() => {});
  }
}

export const PgEvaluationsRepository = PostgresEvaluationsRepository;
