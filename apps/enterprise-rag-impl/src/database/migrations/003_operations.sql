CREATE POLICY jobs_retry ON ingestion_jobs FOR UPDATE TO rag_app
 USING(EXISTS(SELECT 1 FROM documents d WHERE d.id=document_id AND d.owner_sub=actor_sub() AND d.deleted_at IS NULL))
 WITH CHECK(EXISTS(SELECT 1 FROM documents d WHERE d.id=document_id AND d.owner_sub=actor_sub() AND d.deleted_at IS NULL));
-- Index used for case and run pagination.
CREATE INDEX IF NOT EXISTS evaluation_cases_dataset_idx ON evaluation_cases(dataset_id,created_at);
CREATE INDEX IF NOT EXISTS evaluation_runs_dataset_idx ON evaluation_runs(dataset_id,started_at DESC);
