-- Executed as privileged migration identity, NEVER as the web application's role.
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS vector;
CREATE TABLE IF NOT EXISTS users (sub text PRIMARY KEY, email text, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS tenants (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL CHECK (length(name) BETWEEN 2 AND 100), created_by_sub text NOT NULL REFERENCES users(sub), created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS memberships (tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE, user_sub text NOT NULL REFERENCES users(sub), role text NOT NULL CHECK(role IN ('owner','admin','viewer')), PRIMARY KEY(tenant_id,user_sub));
CREATE TABLE IF NOT EXISTS knowledge_bases (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES tenants(id), name text NOT NULL CHECK(length(name) BETWEEN 2 AND 120), created_by_sub text NOT NULL REFERENCES users(sub), UNIQUE(id,tenant_id));
CREATE TABLE IF NOT EXISTS documents (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL, knowledge_base_id uuid NOT NULL, owner_sub text NOT NULL REFERENCES users(sub), title text NOT NULL CHECK(length(title) BETWEEN 1 AND 180), body text NOT NULL CHECK(octet_length(body) <= 102400), visibility text NOT NULL CHECK (visibility IN ('private','tenant')), status text NOT NULL DEFAULT 'queued' CHECK(status IN ('queued','processing','ready','failed')), created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(id,tenant_id), FOREIGN KEY(knowledge_base_id,tenant_id) REFERENCES knowledge_bases(id,tenant_id));
CREATE TABLE IF NOT EXISTS document_chunks (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL, document_id uuid NOT NULL, ordinal integer NOT NULL, content text NOT NULL, vector vector(768), search_vector tsvector GENERATED ALWAYS AS (to_tsvector('simple',content)) STORED, UNIQUE(document_id,ordinal), FOREIGN KEY(document_id,tenant_id) REFERENCES documents(id,tenant_id) ON DELETE CASCADE);
CREATE INDEX IF NOT EXISTS chunks_search_idx ON document_chunks USING GIN(search_vector);
CREATE INDEX IF NOT EXISTS chunks_doc_idx ON document_chunks(document_id);
CREATE TABLE IF NOT EXISTS ingestion_jobs (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), document_id uuid NOT NULL UNIQUE REFERENCES documents(id), status text NOT NULL CHECK(status IN ('pending','processing','completed','failed')), attempts integer NOT NULL DEFAULT 0, error_message text, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());

-- SECURITY DEFINER function is used ONLY for membership lookup, avoids RLS recursion.
CREATE OR REPLACE FUNCTION actor_sub() RETURNS text LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('app.actor_sub',true),'') $$;
CREATE OR REPLACE FUNCTION is_tenant_member(t uuid) RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$ SELECT EXISTS(SELECT 1 FROM memberships WHERE tenant_id = t AND user_sub = actor_sub()) $$;
CREATE OR REPLACE FUNCTION is_tenant_manager(t uuid) RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$ SELECT EXISTS(SELECT 1 FROM memberships WHERE tenant_id=t AND user_sub=actor_sub() AND role IN ('owner','admin')) $$;
CREATE OR REPLACE FUNCTION can_read_document(d uuid) RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$ SELECT EXISTS(SELECT 1 FROM documents doc WHERE doc.id=d AND doc.status='ready' AND is_tenant_member(doc.tenant_id) AND (doc.owner_sub=actor_sub() OR doc.visibility='tenant')) $$;

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_bases ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingestion_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY users_self ON users USING(sub=actor_sub()) WITH CHECK(sub=actor_sub());
CREATE POLICY tenants_visible ON tenants USING(is_tenant_member(id) OR created_by_sub=actor_sub()) WITH CHECK(created_by_sub=actor_sub());
CREATE POLICY memberships_visible ON memberships USING(user_sub=actor_sub() OR is_tenant_manager(tenant_id)) WITH CHECK(is_tenant_manager(tenant_id) OR (user_sub=actor_sub() AND EXISTS(SELECT 1 FROM tenants WHERE id=tenant_id AND created_by_sub=actor_sub())));
CREATE POLICY kbs_visible ON knowledge_bases USING(is_tenant_member(tenant_id)) WITH CHECK(is_tenant_manager(tenant_id) AND created_by_sub=actor_sub());
CREATE POLICY docs_read ON documents FOR SELECT USING(is_tenant_member(tenant_id) AND (owner_sub=actor_sub() OR (visibility='tenant' AND status='ready')));
CREATE POLICY docs_insert ON documents FOR INSERT WITH CHECK(owner_sub=actor_sub() AND is_tenant_manager(tenant_id));
CREATE POLICY docs_update ON documents FOR UPDATE USING(owner_sub=actor_sub() AND is_tenant_manager(tenant_id)) WITH CHECK(owner_sub=actor_sub() AND is_tenant_manager(tenant_id));
CREATE POLICY chunks_read ON document_chunks FOR SELECT USING(can_read_document(document_id));
CREATE POLICY jobs_access ON ingestion_jobs USING(EXISTS(SELECT 1 FROM documents d WHERE d.id=document_id AND d.owner_sub=actor_sub()));

GRANT SELECT,INSERT,UPDATE ON users,tenants,memberships,knowledge_bases,documents TO rag_app;
GRANT SELECT ON document_chunks TO rag_app;
GRANT SELECT,INSERT ON ingestion_jobs TO rag_app;
CREATE POLICY jobs_insert ON ingestion_jobs FOR INSERT TO rag_app WITH CHECK(EXISTS(SELECT 1 FROM documents d WHERE d.id=document_id AND d.owner_sub=actor_sub()));
GRANT EXECUTE ON FUNCTION actor_sub(),is_tenant_member(uuid),is_tenant_manager(uuid),can_read_document(uuid) TO rag_app;
-- Worker identity is separate DB role with restricted exposure; it may change jobs/chunks.
GRANT SELECT,UPDATE ON documents TO rag_worker;
GRANT SELECT,INSERT,UPDATE,DELETE ON document_chunks TO rag_worker;
GRANT SELECT,UPDATE ON ingestion_jobs TO rag_worker;
GRANT EXECUTE ON FUNCTION actor_sub(),is_tenant_member(uuid),is_tenant_manager(uuid),can_read_document(uuid) TO rag_worker;
-- Worker bypasses RLS on these specific internal tables through policies set below, never API role.
CREATE POLICY worker_documents ON documents TO rag_worker USING(true) WITH CHECK(true);
CREATE POLICY worker_chunks ON document_chunks TO rag_worker USING(true) WITH CHECK(true);
CREATE POLICY worker_jobs ON ingestion_jobs TO rag_worker USING(true) WITH CHECK(true);
