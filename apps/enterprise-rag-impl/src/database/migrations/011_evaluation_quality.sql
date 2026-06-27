-- Versioned, reproducible retrieval scorecards, including expected-abstention cases.
ALTER TABLE evaluation_cases DROP CONSTRAINT IF EXISTS evaluation_cases_expected_document_ids_check;
ALTER TABLE evaluation_cases ADD COLUMN IF NOT EXISTS expected_abstention boolean NOT NULL DEFAULT false;
ALTER TABLE evaluation_cases ADD CONSTRAINT eval_ground_truth_consistency CHECK (
 (expected_abstention AND cardinality(expected_document_ids)=0)
 OR (NOT expected_abstention AND cardinality(expected_document_ids) BETWEEN 1 AND 20)
);
ALTER TABLE evaluation_runs ADD COLUMN IF NOT EXISTS dataset_revision integer;
ALTER TABLE evaluation_runs ADD COLUMN IF NOT EXISTS ndcg_at_6 numeric(7,5);
ALTER TABLE evaluation_runs ADD COLUMN IF NOT EXISTS precision_at_6 numeric(7,5);
ALTER TABLE evaluation_runs ADD COLUMN IF NOT EXISTS abstention_pass_rate numeric(7,5);
ALTER TABLE evaluation_results ADD COLUMN IF NOT EXISTS ndcg_at_6 numeric(7,5) NOT NULL DEFAULT 0;
ALTER TABLE evaluation_results ADD COLUMN IF NOT EXISTS precision_at_6 numeric(7,5) NOT NULL DEFAULT 0;
ALTER TABLE evaluation_results ADD COLUMN IF NOT EXISTS abstention_pass boolean;
