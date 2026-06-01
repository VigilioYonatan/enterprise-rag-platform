-- Optional group grants and HNSW indexing for hybrid retrieval.
CREATE TABLE IF NOT EXISTS access_groups (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
 name text NOT NULL CHECK(length(name) BETWEEN 2 AND 100),UNIQUE(id,tenant_id),UNIQUE(tenant_id,name)
);
CREATE TABLE IF NOT EXISTS access_group_memberships (
 group_id uuid NOT NULL,tenant_id uuid NOT NULL,user_sub text NOT NULL,
 PRIMARY KEY(group_id,user_sub),FOREIGN KEY(group_id,tenant_id) REFERENCES access_groups(id,tenant_id) ON DELETE CASCADE,
 FOREIGN KEY(tenant_id,user_sub) REFERENCES memberships(tenant_id,user_sub) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS document_group_grants (
 document_id uuid NOT NULL,group_id uuid NOT NULL,tenant_id uuid NOT NULL,
 created_by_sub text NOT NULL REFERENCES users(sub),created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(document_id,group_id),FOREIGN KEY(document_id,tenant_id) REFERENCES documents(id,tenant_id) ON DELETE CASCADE,
 FOREIGN KEY(group_id,tenant_id) REFERENCES access_groups(id,tenant_id) ON DELETE CASCADE
);
ALTER TABLE access_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE access_group_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_group_grants ENABLE ROW LEVEL SECURITY;
CREATE POLICY groups_member ON access_groups TO rag_app USING(is_tenant_member(tenant_id)) WITH CHECK(is_tenant_manager(tenant_id));
CREATE POLICY group_members ON access_group_memberships TO rag_app USING(is_tenant_member(tenant_id)) WITH CHECK(is_tenant_manager(tenant_id));
CREATE POLICY group_doc_owner ON document_group_grants TO rag_app
 USING(is_document_owner(document_id)) WITH CHECK(is_document_owner(document_id) AND created_by_sub=actor_sub());
CREATE OR REPLACE FUNCTION is_document_grantee(d uuid) RETURNS boolean
 LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
 SELECT EXISTS(SELECT 1 FROM document_grants g WHERE g.document_id=d AND g.user_sub=actor_sub())
 OR EXISTS(SELECT 1 FROM document_group_grants g JOIN access_group_memberships gm
   ON gm.group_id=g.group_id WHERE g.document_id=d AND gm.user_sub=actor_sub()) $$;
GRANT SELECT,INSERT,DELETE,UPDATE ON access_groups,access_group_memberships,document_group_grants TO rag_app;
-- pgvector HNSW index: measure selectivity/pre-filter behavior with EXPLAIN before increasing probes.
CREATE INDEX IF NOT EXISTS chunks_vector_hnsw_idx ON document_chunks USING hnsw (vector vector_cosine_ops) WHERE vector IS NOT NULL;
