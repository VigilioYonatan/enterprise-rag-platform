-- 002: Governance, authorized citations, evaluation, usage and document lifecycle.
-- All API tables are RLS-enforced for rag_app; application never has BYPASSRLS.
ALTER TABLE documents ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1 CHECK (version > 0);
ALTER TABLE documents ADD COLUMN IF NOT EXISTS original_filename text;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS media_type text;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS file_path text;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS file_sha256 text;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS byte_size integer CHECK(byte_size BETWEEN 0 AND 20971520);
ALTER TABLE document_chunks ADD COLUMN IF NOT EXISTS document_version integer NOT NULL DEFAULT 1;
ALTER TABLE ingestion_jobs ADD COLUMN IF NOT EXISTS next_attempt_at timestamptz DEFAULT now();
ALTER TABLE ingestion_jobs ADD COLUMN IF NOT EXISTS completed_at timestamptz;
ALTER TABLE ingestion_jobs ADD COLUMN IF NOT EXISTS stage text NOT NULL DEFAULT 'queued';
CREATE INDEX IF NOT EXISTS ingestion_jobs_pending_idx ON ingestion_jobs(status,next_attempt_at,created_at);
CREATE INDEX IF NOT EXISTS chunks_tenant_doc_idx ON document_chunks(tenant_id,document_id);
CREATE INDEX IF NOT EXISTS docs_kb_live_idx ON documents(knowledge_base_id,created_at DESC) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS document_versions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),document_id uuid NOT NULL,tenant_id uuid NOT NULL,version integer NOT NULL,
 sha256 text,media_type text,original_filename text,created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(document_id,version),FOREIGN KEY(document_id,tenant_id) REFERENCES documents(id,tenant_id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS document_grants (
 document_id uuid NOT NULL,tenant_id uuid NOT NULL,user_sub text NOT NULL REFERENCES users(sub),
 permission text NOT NULL DEFAULT 'read' CHECK(permission IN ('read')),
 created_by_sub text NOT NULL REFERENCES users(sub),created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(document_id,user_sub), FOREIGN KEY(document_id,tenant_id) REFERENCES documents(id,tenant_id) ON DELETE CASCADE,
 FOREIGN KEY(tenant_id,user_sub) REFERENCES memberships(tenant_id,user_sub) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS conversations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),knowledge_base_id uuid NOT NULL,tenant_id uuid NOT NULL,
 created_by_sub text NOT NULL REFERENCES users(sub),title text NOT NULL CHECK(length(title) BETWEEN 1 AND 140),
 created_at timestamptz NOT NULL DEFAULT now(),deleted_at timestamptz,
 FOREIGN KEY(knowledge_base_id,tenant_id) REFERENCES knowledge_bases(id,tenant_id)
);
CREATE INDEX IF NOT EXISTS conversations_owner_idx ON conversations(created_by_sub,created_at DESC);
CREATE TABLE IF NOT EXISTS messages (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
 role text NOT NULL CHECK(role IN ('user','assistant')), content text NOT NULL CHECK(length(content) BETWEEN 1 AND 20000),
 abstained boolean NOT NULL DEFAULT false,created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS messages_conversation_idx ON messages(conversation_id,created_at,id);
CREATE TABLE IF NOT EXISTS answer_citations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),message_id uuid NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
 document_id uuid NOT NULL,chunk_id uuid NOT NULL REFERENCES document_chunks(id) ON DELETE CASCADE,
 document_version integer NOT NULL,reference_index integer NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(message_id,reference_index)
);
CREATE TABLE IF NOT EXISTS evaluation_datasets (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL REFERENCES tenants(id),
 knowledge_base_id uuid NOT NULL,created_by_sub text NOT NULL REFERENCES users(sub),
 name text NOT NULL CHECK(length(name) BETWEEN 2 AND 120),revision integer NOT NULL DEFAULT 1,
 created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(knowledge_base_id,tenant_id) REFERENCES knowledge_bases(id,tenant_id)
);
CREATE TABLE IF NOT EXISTS evaluation_cases (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),dataset_id uuid NOT NULL REFERENCES evaluation_datasets(id) ON DELETE CASCADE,
 question text NOT NULL CHECK(length(question) BETWEEN 2 AND 500),
 expected_document_ids uuid[] NOT NULL CHECK(cardinality(expected_document_ids) BETWEEN 1 AND 20),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS evaluation_runs (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),dataset_id uuid NOT NULL REFERENCES evaluation_datasets(id),
 created_by_sub text NOT NULL REFERENCES users(sub),status text NOT NULL DEFAULT 'running' CHECK(status IN ('running','completed','failed')),
 recall_at_6 numeric(7,5),mrr_at_6 numeric(7,5),case_count integer NOT NULL DEFAULT 0,
 started_at timestamptz NOT NULL DEFAULT now(),completed_at timestamptz,error_code text
);
CREATE TABLE IF NOT EXISTS evaluation_results (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),run_id uuid NOT NULL REFERENCES evaluation_runs(id) ON DELETE CASCADE,
 case_id uuid NOT NULL REFERENCES evaluation_cases(id),rank_of_first_match integer,recall_at_6 numeric(7,5) NOT NULL,
 retrieved_document_ids uuid[] NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(run_id,case_id)
);
CREATE TABLE IF NOT EXISTS usage_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL REFERENCES tenants(id),
 actor_sub text NOT NULL REFERENCES users(sub),category text NOT NULL CHECK(category IN ('answer','retrieval','evaluation')),
 input_tokens integer NOT NULL DEFAULT 0 CHECK(input_tokens>=0),output_tokens integer NOT NULL DEFAULT 0 CHECK(output_tokens>=0),
 latency_ms integer NOT NULL DEFAULT 0 CHECK(latency_ms>=0),created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS usage_tenant_time_idx ON usage_events(tenant_id,created_at DESC);
CREATE TABLE IF NOT EXISTS tenant_budgets (
 tenant_id uuid PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
 daily_answer_limit integer NOT NULL DEFAULT 100 CHECK(daily_answer_limit BETWEEN 1 AND 10000),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS audit_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL REFERENCES tenants(id),
 actor_sub text NOT NULL REFERENCES users(sub),action text NOT NULL CHECK(length(action) BETWEEN 3 AND 100),
 target_type text NOT NULL,target_id text NOT NULL,created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS audit_tenant_time_idx ON audit_events(tenant_id,created_at DESC);

-- Private grants cannot be circumvented by a tenant manager. No document text in these helpers.
CREATE OR REPLACE FUNCTION is_document_owner(d uuid) RETURNS boolean
 LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
 SELECT EXISTS(SELECT 1 FROM documents x WHERE x.id=d AND x.owner_sub=actor_sub() AND x.deleted_at IS NULL) $$;
CREATE OR REPLACE FUNCTION is_document_grantee(d uuid) RETURNS boolean
 LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
 SELECT EXISTS(SELECT 1 FROM document_grants g WHERE g.document_id=d AND g.user_sub=actor_sub()) $$;
CREATE OR REPLACE FUNCTION can_read_document(d uuid) RETURNS boolean
 LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
 SELECT EXISTS(SELECT 1 FROM documents x WHERE x.id=d AND x.status='ready' AND x.deleted_at IS NULL
 AND is_tenant_member(x.tenant_id) AND (x.owner_sub=actor_sub() OR x.visibility='tenant' OR is_document_grantee(x.id))) $$;
DROP POLICY IF EXISTS docs_read ON documents;
CREATE POLICY docs_read ON documents FOR SELECT TO rag_app USING (
 deleted_at IS NULL AND is_tenant_member(tenant_id) AND
 (owner_sub=actor_sub() OR (visibility='tenant' AND status='ready') OR is_document_grantee(id)));
DROP POLICY IF EXISTS docs_update ON documents;
CREATE POLICY docs_update ON documents FOR UPDATE TO rag_app
 USING(owner_sub=actor_sub() AND is_tenant_member(tenant_id) AND deleted_at IS NULL)
 WITH CHECK(owner_sub=actor_sub() AND is_tenant_member(tenant_id));
DROP POLICY IF EXISTS jobs_access ON ingestion_jobs;
CREATE POLICY jobs_access ON ingestion_jobs FOR SELECT TO rag_app
 USING(EXISTS(SELECT 1 FROM documents d WHERE d.id=document_id AND d.owner_sub=actor_sub()));
ALTER TABLE document_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE answer_citations ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluation_datasets ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluation_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluation_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluation_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY versions_read ON document_versions FOR SELECT TO rag_app USING(can_read_document(document_id) OR is_document_owner(document_id));
CREATE POLICY grants_owner ON document_grants TO rag_app USING(is_document_owner(document_id)) WITH CHECK (
 is_document_owner(document_id) AND is_tenant_member(tenant_id) AND created_by_sub=actor_sub()
);
CREATE POLICY conversations_owner ON conversations TO rag_app
 USING(created_by_sub=actor_sub() AND deleted_at IS NULL AND is_tenant_member(tenant_id))
 WITH CHECK(created_by_sub=actor_sub() AND is_tenant_member(tenant_id));
CREATE POLICY messages_owner ON messages TO rag_app USING(EXISTS(
 SELECT 1 FROM conversations c WHERE c.id=conversation_id AND c.created_by_sub=actor_sub() AND c.deleted_at IS NULL))
 WITH CHECK(EXISTS(SELECT 1 FROM conversations c WHERE c.id=conversation_id AND c.created_by_sub=actor_sub() AND c.deleted_at IS NULL));
CREATE POLICY citations_owner ON answer_citations TO rag_app USING(
 EXISTS(SELECT 1 FROM messages m JOIN conversations c ON c.id=m.conversation_id
 WHERE m.id=message_id AND c.created_by_sub=actor_sub() AND c.deleted_at IS NULL)
 AND can_read_document(document_id))
 WITH CHECK(EXISTS(SELECT 1 FROM messages m JOIN conversations c ON c.id=m.conversation_id
 WHERE m.id=message_id AND c.created_by_sub=actor_sub() AND c.deleted_at IS NULL)
 AND can_read_document(document_id));
CREATE POLICY datasets_owner ON evaluation_datasets TO rag_app
 USING(created_by_sub=actor_sub() AND is_tenant_member(tenant_id))
 WITH CHECK(created_by_sub=actor_sub() AND is_tenant_manager(tenant_id));
CREATE POLICY cases_owner ON evaluation_cases TO rag_app USING(EXISTS(
 SELECT 1 FROM evaluation_datasets d WHERE d.id=dataset_id AND d.created_by_sub=actor_sub()))
 WITH CHECK(EXISTS(SELECT 1 FROM evaluation_datasets d WHERE d.id=dataset_id AND d.created_by_sub=actor_sub()));
CREATE POLICY runs_owner ON evaluation_runs TO rag_app USING(created_by_sub=actor_sub() AND EXISTS(
 SELECT 1 FROM evaluation_datasets d WHERE d.id=dataset_id AND d.created_by_sub=actor_sub()))
 WITH CHECK(created_by_sub=actor_sub() AND EXISTS(
 SELECT 1 FROM evaluation_datasets d WHERE d.id=dataset_id AND d.created_by_sub=actor_sub()));
CREATE POLICY results_owner ON evaluation_results TO rag_app USING(EXISTS(
 SELECT 1 FROM evaluation_runs r WHERE r.id=run_id AND r.created_by_sub=actor_sub()))
 WITH CHECK(EXISTS(SELECT 1 FROM evaluation_runs r WHERE r.id=run_id AND r.created_by_sub=actor_sub()));
CREATE POLICY usage_member ON usage_events TO rag_app USING(
 is_tenant_manager(tenant_id) OR (actor_sub=actor_sub() AND is_tenant_member(tenant_id)))
 WITH CHECK(actor_sub=actor_sub() AND is_tenant_member(tenant_id));
CREATE POLICY budgets_manager ON tenant_budgets TO rag_app USING(is_tenant_member(tenant_id))
 WITH CHECK(is_tenant_manager(tenant_id));
CREATE POLICY audit_manager ON audit_events TO rag_app USING(is_tenant_manager(tenant_id))
 WITH CHECK(actor_sub=actor_sub() AND is_tenant_member(tenant_id));
GRANT SELECT,INSERT,UPDATE ON document_grants TO rag_app;
GRANT DELETE ON document_grants TO rag_app;
GRANT SELECT,INSERT ON document_versions TO rag_app;
GRANT SELECT,INSERT,UPDATE ON conversations,messages,evaluation_datasets,evaluation_runs,usage_events,tenant_budgets,audit_events TO rag_app;
GRANT SELECT,INSERT ON answer_citations,evaluation_cases,evaluation_results TO rag_app;
GRANT SELECT ON document_chunks TO rag_app;
GRANT SELECT,UPDATE ON ingestion_jobs TO rag_app;
GRANT SELECT,UPDATE ON memberships TO rag_app;
GRANT EXECUTE ON FUNCTION is_document_owner(uuid),is_document_grantee(uuid),can_read_document(uuid) TO rag_app;
GRANT SELECT,INSERT,UPDATE ON document_versions TO rag_worker;
GRANT SELECT ON evaluation_datasets,evaluation_cases TO rag_worker;
CREATE POLICY worker_versions ON document_versions TO rag_worker USING(true) WITH CHECK(true);
CREATE POLICY worker_datasets ON evaluation_datasets TO rag_worker USING(true);
CREATE POLICY worker_cases ON evaluation_cases TO rag_worker USING(true);
