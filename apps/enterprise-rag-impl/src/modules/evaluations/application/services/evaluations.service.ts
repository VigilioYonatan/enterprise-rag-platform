import { Inject, Injectable, Optional } from '@nestjs/common';
import type { PaginationWindow } from '~/shared/types/pagination.type';
import { RetrievalService } from '../../../knowledge/application/services/retrieval.service';
import { evaluateRetrieval } from '../../domain/retrieval-metrics';
import { PostgresEvaluationsRepository } from '../../infrastructure/persistence/evaluations.repository';
import {
  type ComputedCaseMetric,
  EVALUATIONS_REPOSITORY,
  type EvaluationsRepositoryPort,
} from '../ports/evaluations-repository.port';

export function summarizeEvaluationRunMetrics(results: ComputedCaseMetric[]) {
  const positives = results.filter((caseMetric) => !caseMetric.expected_abstention);
  const negatives = results.filter((caseMetric) => caseMetric.expected_abstention);

  const avgPositive = (pick: (metric: ComputedCaseMetric) => number): number | null =>
    positives.length > 0 ? positives.reduce((sum, metric) => sum + pick(metric), 0) / positives.length : null;

  return {
    recall: avgPositive((metric) => metric.recall_at_6),
    mrr: avgPositive((metric) => metric.mrr_at_6),
    ndcg: avgPositive((metric) => metric.ndcg_at_6),
    precision: avgPositive((metric) => metric.precision_at_6),
    abstention:
      negatives.length > 0
        ? negatives.filter((metric) => metric.abstention_pass === true).length / negatives.length
        : null,
  };
}

@Injectable()
export class EvaluationsService {
  private readonly repository: EvaluationsRepositoryPort;

  constructor(
    @Inject(RetrievalService) private readonly retrievalService: RetrievalService,
    @Optional() @Inject(EVALUATIONS_REPOSITORY) repository?: EvaluationsRepositoryPort,
  ) {
    this.repository = repository ?? new PostgresEvaluationsRepository();
  }

  listDatasets(actor_sub: string, tenant_id: string, pagination?: PaginationWindow) {
    return this.repository.listDatasets
      ? this.repository.listDatasets(actor_sub, tenant_id, pagination)
      : this.repository.datasets(actor_sub, tenant_id, pagination);
  }

  /** Backward compatibility alias */
  datasets(actor_sub: string, tenant_id: string, pagination?: PaginationWindow) {
    return this.listDatasets(actor_sub, tenant_id, pagination);
  }

  createDataset(actor_sub: string, tenant_id: string, knowledge_base_id: string, name: string) {
    return this.repository.createDataset(actor_sub, tenant_id, knowledge_base_id, name);
  }

  deleteDataset(actor_sub: string, dataset_id: string) {
    return this.repository.deleteDataset(actor_sub, dataset_id);
  }

  listDatasetCases(actor_sub: string, dataset_id: string, pagination?: PaginationWindow) {
    return this.repository.listDatasetCases
      ? this.repository.listDatasetCases(actor_sub, dataset_id, pagination)
      : this.repository.cases(actor_sub, dataset_id, pagination);
  }

  /** Backward compatibility alias */
  cases(actor_sub: string, dataset_id: string, pagination?: PaginationWindow) {
    return this.listDatasetCases(actor_sub, dataset_id, pagination);
  }

  addDatasetCase(
    actor_sub: string,
    dataset_id: string,
    question: string,
    expected: string[],
    abstain = false,
  ) {
    return this.repository.addDatasetCase
      ? this.repository.addDatasetCase(actor_sub, dataset_id, question, expected, abstain)
      : this.repository.addCase(actor_sub, dataset_id, question, expected, abstain);
  }

  /** Backward compatibility alias */
  addCase(actor_sub: string, dataset_id: string, question: string, expected: string[], abstain = false) {
    return this.addDatasetCase(actor_sub, dataset_id, question, expected, abstain);
  }

  deleteDatasetCase(actor_sub: string, dataset_id: string, case_id: string) {
    return this.repository.deleteDatasetCase
      ? this.repository.deleteDatasetCase(actor_sub, dataset_id, case_id)
      : this.repository.deleteCase(actor_sub, dataset_id, case_id);
  }

  /** Backward compatibility alias */
  deleteCase(actor_sub: string, dataset_id: string, case_id: string) {
    return this.deleteDatasetCase(actor_sub, dataset_id, case_id);
  }

  listEvaluationRuns(actor_sub: string, tenant_id: string, pagination?: PaginationWindow) {
    return this.repository.listEvaluationRuns
      ? this.repository.listEvaluationRuns(actor_sub, tenant_id, pagination)
      : this.repository.runs(actor_sub, tenant_id, pagination);
  }

  /** Backward compatibility alias */
  runs(actor_sub: string, tenant_id: string, pagination?: PaginationWindow) {
    return this.listEvaluationRuns(actor_sub, tenant_id, pagination);
  }

  getEvaluationRunDetail(actor_sub: string, run_id: string) {
    return this.repository.getEvaluationRunDetail
      ? this.repository.getEvaluationRunDetail(actor_sub, run_id)
      : this.repository.getRun(actor_sub, run_id);
  }

  /** Backward compatibility alias */
  getRun(actor_sub: string, run_id: string) {
    return this.getEvaluationRunDetail(actor_sub, run_id);
  }

  async executeEvaluationRun(actor_sub: string, dataset_id: string) {
    const startedAt = Date.now();
    const context = await this.repository.startRun(actor_sub, dataset_id);
    try {
      const results: ComputedCaseMetric[] = [];
      for (const sample of context.cases) {
        const hits = await this.retrievalService.search(
          actor_sub,
          context.knowledge_base_id ?? context.kb,
          sample.question,
        );
        const docs = [...new Set(hits.map((searchHit) => searchHit.document_id))];
        const metrics = evaluateRetrieval(sample.expected_document_ids, docs, sample.expected_abstention);
        results.push({
          case_id: sample.id,
          docs,
          expected_abstention: sample.expected_abstention,
          ...metrics,
        });
      }

      const aggregated = summarizeEvaluationRunMetrics(results);
      return await this.repository.completeRun(actor_sub, context.tenant_id, context.run_id, results, {
        ...aggregated,
        caseCount: results.length,
        latencyMs: Math.max(0, Date.now() - startedAt),
      });
    } catch (error) {
      await this.repository.failRun(actor_sub, context.run_id);
      throw error;
    }
  }

  /** Backward compatibility alias */
  run(actor_sub: string, dataset_id: string) {
    return this.executeEvaluationRun(actor_sub, dataset_id);
  }
}
