-- Crash recovery: expired workers can be reclaimed; fencing token prevents stale commits.
ALTER TABLE ingestion_jobs ADD COLUMN IF NOT EXISTS lease_token uuid;
ALTER TABLE ingestion_jobs ADD COLUMN IF NOT EXISTS lease_expires_at timestamptz;
CREATE INDEX IF NOT EXISTS ingestion_processing_lease_idx ON ingestion_jobs(lease_expires_at)
 WHERE status='processing';
-- Backfill in-flight jobs from pre-lease deployments so they can be reclaimed.
UPDATE ingestion_jobs SET lease_expires_at=now()-interval '1 second'
 WHERE status='processing' AND lease_expires_at IS NULL;
