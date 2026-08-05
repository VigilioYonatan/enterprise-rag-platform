import type { CountedRows, PaginationWindow } from '../../../../shared/types/pagination.type';
import type {
  CaseResponseDto,
  DatasetResponseDto,
  RunDetailResponseDto,
  RunSummaryResponseDto,
} from '../../presentation/http/dto/evaluations.dto';
import type { ComputedCaseMetric, EvaluationRunCaseSample } from '../../types/evaluations.type';

export type { ComputedCaseMetric, EvaluationRunCaseSample };

export interface EvaluationsRepositoryPort {
  listDatasets?(
    actor_sub: string,
    tenant_id: string,
    pagination?: PaginationWindow,
  ): Promise<CountedRows<DatasetResponseDto>>;
  datasets(
    actor_sub: string,
    tenant_id: string,
    pagination?: PaginationWindow,
  ): Promise<CountedRows<DatasetResponseDto>>;

  createDataset(
    actor_sub: string,
    tenant_id: string,
    knowledge_base_id: string,
    name: string,
  ): Promise<DatasetResponseDto>;
  deleteDataset(actor_sub: string, dataset_id: string): Promise<{ deleted: boolean }>;

  listDatasetCases?(
    actor_sub: string,
    dataset_id: string,
    pagination?: PaginationWindow,
  ): Promise<CountedRows<CaseResponseDto>>;
  cases(
    actor_sub: string,
    dataset_id: string,
    pagination?: PaginationWindow,
  ): Promise<CountedRows<CaseResponseDto>>;

  addDatasetCase?(
    actor_sub: string,
    dataset_id: string,
    question: string,
    expected: string[],
    abstain: boolean,
  ): Promise<CaseResponseDto>;
  addCase(
    actor_sub: string,
    dataset_id: string,
    question: string,
    expected: string[],
    abstain: boolean,
  ): Promise<CaseResponseDto>;

  deleteDatasetCase?(actor_sub: string, dataset_id: string, case_id: string): Promise<{ deleted: boolean }>;
  deleteCase(actor_sub: string, dataset_id: string, case_id: string): Promise<{ deleted: boolean }>;

  listEvaluationRuns?(
    actor_sub: string,
    tenant_id: string,
    pagination?: PaginationWindow,
  ): Promise<CountedRows<RunSummaryResponseDto>>;
  runs(
    actor_sub: string,
    tenant_id: string,
    pagination?: PaginationWindow,
  ): Promise<CountedRows<RunSummaryResponseDto>>;

  getEvaluationRunDetail?(actor_sub: string, run_id: string): Promise<RunDetailResponseDto>;
  getRun(actor_sub: string, run_id: string): Promise<RunDetailResponseDto>;

  startRun(
    actor_sub: string,
    dataset_id: string,
  ): Promise<{
    tenant_id: string;
    knowledge_base_id?: string;
    kb: string;
    cases: EvaluationRunCaseSample[];
    run_id: string;
  }>;

  completeRun(
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
  ): Promise<RunDetailResponseDto>;

  failRun(actor_sub: string, run_id: string): Promise<void>;
}

export const EVALUATIONS_REPOSITORY = Symbol('EVALUATIONS_REPOSITORY');
