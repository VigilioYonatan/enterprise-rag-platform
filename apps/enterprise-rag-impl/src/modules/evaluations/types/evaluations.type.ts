export interface EvaluationRunCaseSample {
  id: string;
  question: string;
  expected_document_ids: string[];
  expected_abstention: boolean;
}

export interface ComputedCaseMetric {
  case_id: string;
  docs: string[];
  expected_abstention: boolean;
  recall_at_6: number;
  mrr_at_6: number;
  ndcg_at_6: number;
  precision_at_6: number;
  rank_of_first_match: number | null;
  abstention_pass: boolean | null;
}

export interface EvaluationRunSummaryMetrics {
  recall: number | null;
  mrr: number | null;
  ndcg: number | null;
  precision: number | null;
  abstention: number | null;
  caseCount: number;
  latencyMs: number;
}
