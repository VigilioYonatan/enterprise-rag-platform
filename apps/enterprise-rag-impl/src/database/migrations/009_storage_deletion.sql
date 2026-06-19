-- Private-object lifecycle: revoke immediately; physically erase asynchronously with retries.
CREATE TABLE IF NOT EXISTS storage_deletions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 document_id uuid NOT NULL REFERENCES documents(id),
 object_key text NOT NULL UNIQUE,
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','processing','failed')),
 attempts integer NOT NULL DEFAULT 0 CHECK(attempts>=0),
 next_attempt_at timestamptz NOT NULL DEFAULT now(),
 lease_expires_at timestamptz,
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS storage_deletions_schedule_idx ON storage_deletions(status,next_attempt_at);
ALTER TABLE storage_deletions ENABLE ROW LEVEL SECURITY;
CREATE POLICY storage_owner_insert ON storage_deletions FOR INSERT TO rag_app
 WITH CHECK(EXISTS(SELECT 1 FROM documents d WHERE d.id=document_id AND d.owner_sub=actor_sub()));
CREATE POLICY storage_worker_all ON storage_deletions TO rag_worker USING(true) WITH CHECK(true);
GRANT INSERT ON storage_deletions TO rag_app;
GRANT SELECT,UPDATE,DELETE ON storage_deletions TO rag_worker;
GRANT DELETE ON document_chunks TO rag_app;
CREATE POLICY chunks_owner_delete ON document_chunks FOR DELETE TO rag_app USING(is_document_owner(document_id));
