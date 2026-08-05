import { z } from 'zod';
import { createPaginatorDto } from '../../../../../shared/http/dto/paginator.dto';
import { evaluationCaseSchema } from '../../../domain/schemas/evaluation-case.schema';
import { evaluationCaseResultSchema } from '../../../domain/schemas/evaluation-case-result.schema';
import { evaluationDatasetSchema } from '../../../domain/schemas/evaluation-dataset.schema';
import { evaluationRunSchema } from '../../../domain/schemas/evaluation-run.schema';

export const datasetResponseDto = evaluationDatasetSchema.pick({
  id: true,
  tenant_id: true,
  knowledge_base_id: true,
  name: true,
  revision: true,
  created_at: true,
});

export const caseResponseDto = evaluationCaseSchema.pick({
  id: true,
  question: true,
  expected_document_ids: true,
  expected_abstention: true,
});

export const runSummaryResponseDto = evaluationRunSchema.pick({
  id: true,
  dataset_id: true,
  dataset_name: true,
  status: true,
  recall_at_6: true,
  mrr_at_6: true,
  ndcg_at_6: true,
  precision_at_6: true,
  abstention_pass_rate: true,
  dataset_revision: true,
  case_count: true,
  started_at: true,
  completed_at: true,
});

export const caseResultResponseDto = evaluationCaseResultSchema.pick({
  case_id: true,
  rank_of_first_match: true,
  recall_at_6: true,
  ndcg_at_6: true,
  precision_at_6: true,
  abstention_pass: true,
  retrieved_document_ids: true,
});

export const runDetailResponseDto = runSummaryResponseDto.extend({
  results: z.array(caseResultResponseDto),
});

export const deletedEvaluationResponseDto = z.object({
  deleted: z.boolean(),
});
export const deletedEvalResponseDto = deletedEvaluationResponseDto;

export const paginatedDatasetsResponseDto = createPaginatorDto(datasetResponseDto);
export const paginatedCasesResponseDto = createPaginatorDto(caseResponseDto);
export const paginatedRunsResponseDto = createPaginatorDto(runSummaryResponseDto);

export type DatasetResponseDto = z.output<typeof datasetResponseDto>;
export type CaseResponseDto = z.output<typeof caseResponseDto>;
export type RunSummaryResponseDto = z.output<typeof runSummaryResponseDto>;
export type CaseResultResponseDto = z.output<typeof caseResultResponseDto>;
export type RunDetailResponseDto = z.output<typeof runDetailResponseDto>;
export type DeletedEvaluationResponseDto = z.output<typeof deletedEvaluationResponseDto>;
export type DeletedEvalResponseDto = DeletedEvaluationResponseDto;
export type PaginatedDatasetsResponseDto = z.output<typeof paginatedDatasetsResponseDto>;
export type PaginatedCasesResponseDto = z.output<typeof paginatedCasesResponseDto>;
export type PaginatedRunsResponseDto = z.output<typeof paginatedRunsResponseDto>;
