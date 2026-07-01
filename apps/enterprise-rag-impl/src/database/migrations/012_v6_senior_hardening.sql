-- 012: Vigilio Senior Mode 2026 hardening — FORCE RLS, FinOps tenant-wide atomic budget,
-- least-privilege membership/group policies, transactional outbox, idempotency, and Qwen3 1024d / 768d vectors.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'schema_migrations' AND relkind = 'r') THEN
    EXECUTE 'GRANT SELECT ON TABLE schema_migrations TO rag_app';
  END IF;
END $$;

CREATE OR REPLACE FUNCTION is_schema_ready(expected_filename text) RETURNS boolean
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM schema_migrations WHERE filename = expected_filename
  )
$$;
REVOKE ALL ON FUNCTION is_schema_ready(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION is_schema_ready(text) TO rag_app;

-- Helper: strict tenant owner check (distinct from admin manager)
CREATE OR REPLACE FUNCTION is_tenant_owner(t uuid) RETURNS boolean
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM memberships WHERE tenant_id = t AND user_sub = actor_sub() AND role = 'owner'
  )
$$;

-- Helper: document owner OR tenant owner (prevents orphaned documents when an admin leaves)
CREATE OR REPLACE FUNCTION is_document_manager(d uuid) RETURNS boolean
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM documents x
    WHERE x.id = d AND x.deleted_at IS NULL
      AND (x.owner_sub = actor_sub() OR is_tenant_owner(x.tenant_id))
  )
$$;

-- Revoke PUBLIC execution on all prior and new SECURITY DEFINER helpers
REVOKE ALL ON FUNCTION actor_sub() FROM PUBLIC;
REVOKE ALL ON FUNCTION is_tenant_member(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION is_tenant_manager(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION is_tenant_owner(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION is_document_owner(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION is_document_manager(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION is_document_grantee(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION can_read_document(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION answer_has_revoked_evidence(uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION
  actor_sub(),
  is_tenant_member(uuid),
  is_tenant_manager(uuid),
  is_tenant_owner(uuid),
  is_document_owner(uuid),
  is_document_manager(uuid),
  is_document_grantee(uuid),
  can_read_document(uuid),
  answer_has_revoked_evidence(uuid)
TO rag_app, rag_worker;

-- Atomic tenant-wide FinOps budget reservation (prevents viewer N*budget RLS multiplication)
DROP FUNCTION IF EXISTS reserve_tenant_answer_budget(uuid, numeric, text);
DROP FUNCTION IF EXISTS reserve_tenant_answer_budget(uuid, text, numeric);
CREATE OR REPLACE FUNCTION reserve_tenant_answer_budget(
  p_kb_id uuid,
  p_model_name text,
  p_reserved_cost_usd numeric
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_actor text := actor_sub();
  v_tenant_id uuid;
  v_daily_limit integer := 100;
  v_cost_limit numeric(12, 2) := 1000;
  v_used_count bigint := 0;
  v_used_cost numeric(18, 8) := 0;
  v_usage_id uuid;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Unauthenticated actor' USING ERRCODE = '42501';
  END IF;

  SELECT k.tenant_id INTO v_tenant_id
  FROM knowledge_bases k
  WHERE k.id = p_kb_id AND is_tenant_member(k.tenant_id);

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Knowledge base unavailable' USING ERRCODE = 'P0002';
  END IF;

  PERFORM 1 FROM tenants t WHERE t.id = v_tenant_id FOR UPDATE;

  SELECT coalesce(tb.daily_answer_limit, 100), coalesce(tb.daily_cost_limit_usd, 1000)
  INTO v_daily_limit, v_cost_limit
  FROM tenant_budgets tb
  WHERE tb.tenant_id = v_tenant_id;

  SELECT count(*), coalesce(sum(greatest(ue.cost_usd, ue.reserved_cost_usd)), 0)
  INTO v_used_count, v_used_cost
  FROM usage_events ue
  WHERE ue.tenant_id = v_tenant_id
    AND ue.category = 'answer'
    AND ue.created_at >= date_trunc('day', now());

  IF v_used_count >= v_daily_limit THEN
    RAISE EXCEPTION 'Daily tenant answer budget reached' USING ERRCODE = 'P0029';
  END IF;

  IF coalesce(p_reserved_cost_usd, 0) > 0 AND (v_used_cost + p_reserved_cost_usd) > v_cost_limit THEN
    RAISE EXCEPTION 'Daily tenant USD budget reached' USING ERRCODE = 'P0029';
  END IF;

  INSERT INTO usage_events(tenant_id, actor_sub, category, model_name, reserved_cost_usd)
  VALUES (v_tenant_id, v_actor, 'answer', p_model_name, greatest(coalesce(p_reserved_cost_usd, 0), 0))
  RETURNING id INTO v_usage_id;

  RETURN v_usage_id;
END;
$$;
REVOKE ALL ON FUNCTION reserve_tenant_answer_budget(uuid, text, numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION reserve_tenant_answer_budget(uuid, text, numeric) TO rag_app;

-- Settle reserved FinOps usage even if membership changed mid-generation
CREATE OR REPLACE FUNCTION finalize_tenant_answer_usage(
  p_usage_id uuid,
  p_input_tokens integer,
  p_output_tokens integer,
  p_latency_ms integer,
  p_cost_usd numeric
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_actor text := actor_sub();
BEGIN
  IF v_actor IS NULL THEN
    RETURN;
  END IF;
  UPDATE usage_events
  SET input_tokens = greatest(coalesce(p_input_tokens, 0), 0),
      output_tokens = greatest(coalesce(p_output_tokens, 0), 0),
      latency_ms = greatest(coalesce(p_latency_ms, 0), 0),
      cost_usd = greatest(coalesce(p_cost_usd, 0), 0),
      reserved_cost_usd = 0
  WHERE id = p_usage_id AND actor_sub = v_actor;
END;
$$;
REVOKE ALL ON FUNCTION finalize_tenant_answer_usage(uuid, integer, integer, integer, numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION finalize_tenant_answer_usage(uuid, integer, integer, integer, numeric) TO rag_app;

-- Directory helpers that do not drop rows when non-managers inspect group members or document grants
CREATE OR REPLACE FUNCTION list_group_members_for_actor(p_group_id uuid)
RETURNS TABLE(user_sub text, email text)
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT gm.user_sub,
         CASE WHEN is_tenant_manager(gm.tenant_id) OR gm.user_sub = actor_sub() THEN u.email ELSE NULL END AS email
  FROM access_group_memberships gm
  LEFT JOIN users u ON u.sub = gm.user_sub
  WHERE gm.group_id = p_group_id
    AND is_tenant_member(gm.tenant_id)
  ORDER BY u.email NULLS LAST, gm.user_sub
$$;
REVOKE ALL ON FUNCTION list_group_members_for_actor(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION list_group_members_for_actor(uuid) TO rag_app;

CREATE OR REPLACE FUNCTION list_document_grants_for_actor(p_document_id uuid)
RETURNS TABLE(user_sub text, email text, created_at timestamptz)
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT g.user_sub, u.email, g.created_at
  FROM document_grants g
  LEFT JOIN users u ON u.sub = g.user_sub
  WHERE g.document_id = p_document_id
    AND is_document_manager(g.document_id)
  ORDER BY g.created_at
$$;
REVOKE ALL ON FUNCTION list_document_grants_for_actor(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION list_document_grants_for_actor(uuid) TO rag_app;

-- Accurate KB document count independent of caller visibility (enforces 100-doc cap safely)
CREATE OR REPLACE FUNCTION count_active_kb_documents(p_kb_id uuid) RETURNS integer
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT count(*)::int
  FROM documents d
  JOIN knowledge_bases k ON k.id = d.knowledge_base_id
  WHERE d.knowledge_base_id = p_kb_id
    AND d.deleted_at IS NULL
    AND is_tenant_member(k.tenant_id)
$$;
REVOKE ALL ON FUNCTION count_active_kb_documents(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION count_active_kb_documents(uuid) TO rag_app;

-- Split tenants RLS policies (prevent removed creator from retaining access)
DROP POLICY IF EXISTS tenants_visible ON tenants;
DROP POLICY IF EXISTS tenants_select ON tenants;
DROP POLICY IF EXISTS tenants_insert ON tenants;
DROP POLICY IF EXISTS tenants_update ON tenants;
CREATE POLICY tenants_select ON tenants FOR SELECT TO rag_app USING (
  is_tenant_member(id)
  OR (created_by_sub = actor_sub() AND NOT EXISTS (SELECT 1 FROM memberships m WHERE m.tenant_id = tenants.id))
);
CREATE POLICY tenants_insert ON tenants FOR INSERT TO rag_app WITH CHECK (created_by_sub = actor_sub());
CREATE POLICY tenants_update ON tenants FOR UPDATE TO rag_app
  USING (is_tenant_owner(id)) WITH CHECK (is_tenant_owner(id));

-- Split memberships RLS policies (close admin->owner self-promotion and demoted creator escalation)
DROP POLICY IF EXISTS memberships_visible ON memberships;
DROP POLICY IF EXISTS memberships_select ON memberships;
DROP POLICY IF EXISTS memberships_insert ON memberships;
DROP POLICY IF EXISTS memberships_update ON memberships;
DROP POLICY IF EXISTS memberships_delete ON memberships;
CREATE POLICY memberships_select ON memberships FOR SELECT TO rag_app USING (
  user_sub = actor_sub() OR is_tenant_member(tenant_id)
);
CREATE POLICY memberships_insert ON memberships FOR INSERT TO rag_app WITH CHECK (
  is_tenant_owner(tenant_id)
  OR (is_tenant_manager(tenant_id) AND role IN ('admin', 'viewer'))
  OR (
    user_sub = actor_sub()
    AND role = 'owner'
    AND EXISTS (SELECT 1 FROM tenants t WHERE t.id = tenant_id AND t.created_by_sub = actor_sub())
    AND NOT EXISTS (SELECT 1 FROM memberships m WHERE m.tenant_id = memberships.tenant_id)
  )
);
CREATE POLICY memberships_update ON memberships FOR UPDATE TO rag_app
  USING (is_tenant_owner(tenant_id))
  WITH CHECK (is_tenant_owner(tenant_id));
CREATE POLICY memberships_delete ON memberships FOR DELETE TO rag_app USING (
  (is_tenant_owner(tenant_id) AND (
    role <> 'owner'
    OR (SELECT count(*) FROM memberships m2 WHERE m2.tenant_id = memberships.tenant_id AND m2.role = 'owner') > 1
  ))
  OR (is_tenant_manager(tenant_id) AND role = 'viewer')
);
GRANT DELETE ON memberships TO rag_app;

-- Split knowledge_bases policies to allow manager update/delete
DROP POLICY IF EXISTS kbs_visible ON knowledge_bases;
DROP POLICY IF EXISTS kbs_select ON knowledge_bases;
DROP POLICY IF EXISTS kbs_insert ON knowledge_bases;
DROP POLICY IF EXISTS kbs_update ON knowledge_bases;
DROP POLICY IF EXISTS kbs_delete ON knowledge_bases;
CREATE POLICY kbs_select ON knowledge_bases FOR SELECT TO rag_app USING (is_tenant_member(tenant_id));
CREATE POLICY kbs_insert ON knowledge_bases FOR INSERT TO rag_app
  WITH CHECK (is_tenant_manager(tenant_id) AND created_by_sub = actor_sub());
CREATE POLICY kbs_update ON knowledge_bases FOR UPDATE TO rag_app
  USING (is_tenant_manager(tenant_id))
  WITH CHECK (is_tenant_manager(tenant_id));
CREATE POLICY kbs_delete ON knowledge_bases FOR DELETE TO rag_app USING (is_tenant_manager(tenant_id));
GRANT DELETE ON knowledge_bases TO rag_app;

-- Harden documents & grants policies: grantees only see ready docs; tenant owner can manage orphaned docs
DROP POLICY IF EXISTS docs_read ON documents;
CREATE POLICY docs_read ON documents FOR SELECT TO rag_app USING (
  is_tenant_member(tenant_id) AND (
    owner_sub = actor_sub()
    OR is_tenant_owner(tenant_id)
    OR (deleted_at IS NULL AND status = 'ready' AND (visibility = 'tenant' OR is_document_grantee(id)))
  )
);
DROP POLICY IF EXISTS docs_update ON documents;
CREATE POLICY docs_update ON documents FOR UPDATE TO rag_app
  USING (is_document_manager(id) AND is_tenant_member(tenant_id))
  WITH CHECK ((owner_sub = actor_sub() OR is_tenant_owner(tenant_id)) AND is_tenant_member(tenant_id));

DROP POLICY IF EXISTS grants_owner ON document_grants;
CREATE POLICY grants_owner ON document_grants TO rag_app
  USING (is_document_manager(document_id))
  WITH CHECK (is_document_manager(document_id) AND is_tenant_member(tenant_id) AND created_by_sub = actor_sub());

DROP POLICY IF EXISTS group_doc_owner ON document_group_grants;
CREATE POLICY group_doc_owner ON document_group_grants TO rag_app
  USING (is_document_manager(document_id))
  WITH CHECK (is_document_manager(document_id) AND created_by_sub = actor_sub());

DROP POLICY IF EXISTS jobs_access ON ingestion_jobs;
CREATE POLICY jobs_access ON ingestion_jobs FOR SELECT TO rag_app USING (
  EXISTS (SELECT 1 FROM documents d WHERE d.id = document_id AND (d.owner_sub = actor_sub() OR is_tenant_manager(d.tenant_id)))
);
DROP POLICY IF EXISTS jobs_retry ON ingestion_jobs;
CREATE POLICY jobs_retry ON ingestion_jobs FOR UPDATE TO rag_app
  USING (EXISTS (SELECT 1 FROM documents d WHERE d.id = document_id AND d.deleted_at IS NULL AND (d.owner_sub = actor_sub() OR is_tenant_manager(d.tenant_id))))
  WITH CHECK (EXISTS (SELECT 1 FROM documents d WHERE d.id = document_id AND d.deleted_at IS NULL AND (d.owner_sub = actor_sub() OR is_tenant_manager(d.tenant_id))));

DROP POLICY IF EXISTS storage_owner_insert ON storage_deletions;
DROP POLICY IF EXISTS storage_manager_select ON storage_deletions;
CREATE POLICY storage_owner_insert ON storage_deletions FOR INSERT TO rag_app
  WITH CHECK (EXISTS (
    SELECT 1 FROM documents d
    WHERE d.id = document_id
      AND (
        d.owner_sub = actor_sub()
        OR is_tenant_owner(d.tenant_id)
        OR (d.visibility = 'tenant' AND is_tenant_manager(d.tenant_id))
      )
  ));
CREATE POLICY storage_manager_select ON storage_deletions FOR SELECT TO rag_app
  USING (document_id IS NOT NULL AND EXISTS (SELECT 1 FROM documents d WHERE d.id = document_id AND is_tenant_manager(d.tenant_id)));
GRANT SELECT ON storage_deletions TO rag_app;

DROP POLICY IF EXISTS chunks_owner_delete ON document_chunks;
CREATE POLICY chunks_owner_delete ON document_chunks FOR DELETE TO rag_app USING (is_document_manager(document_id));

-- Split access_groups & access_group_memberships policies (prevent viewer DELETE/UPDATE!)
DROP POLICY IF EXISTS groups_member ON access_groups;
DROP POLICY IF EXISTS groups_select ON access_groups;
DROP POLICY IF EXISTS groups_manage ON access_groups;
CREATE POLICY groups_select ON access_groups FOR SELECT TO rag_app USING (is_tenant_member(tenant_id));
CREATE POLICY groups_manage ON access_groups FOR ALL TO rag_app
  USING (is_tenant_manager(tenant_id))
  WITH CHECK (is_tenant_manager(tenant_id));

DROP POLICY IF EXISTS group_members ON access_group_memberships;
DROP POLICY IF EXISTS group_members_select ON access_group_memberships;
DROP POLICY IF EXISTS group_members_manage ON access_group_memberships;
CREATE POLICY group_members_select ON access_group_memberships FOR SELECT TO rag_app USING (is_tenant_member(tenant_id));
CREATE POLICY group_members_manage ON access_group_memberships FOR ALL TO rag_app
  USING (is_tenant_manager(tenant_id))
  WITH CHECK (is_tenant_manager(tenant_id));

-- Split tenant_budgets policies (prevent viewer UPDATE!)
DROP POLICY IF EXISTS budgets_manager ON tenant_budgets;
DROP POLICY IF EXISTS budgets_select ON tenant_budgets;
DROP POLICY IF EXISTS budgets_manage ON tenant_budgets;
CREATE POLICY budgets_select ON tenant_budgets FOR SELECT TO rag_app USING (is_tenant_member(tenant_id));
CREATE POLICY budgets_manage ON tenant_budgets FOR ALL TO rag_app
  USING (is_tenant_manager(tenant_id))
  WITH CHECK (is_tenant_manager(tenant_id));

-- Allow conversation soft-deletion UPDATE (setting deleted_at) by owner
DROP POLICY IF EXISTS conversations_owner ON conversations;
DROP POLICY IF EXISTS conversations_select ON conversations;
DROP POLICY IF EXISTS conversations_insert ON conversations;
DROP POLICY IF EXISTS conversations_update ON conversations;
CREATE POLICY conversations_select ON conversations FOR SELECT TO rag_app
  USING (is_tenant_member(tenant_id) AND created_by_sub = actor_sub());
CREATE POLICY conversations_insert ON conversations FOR INSERT TO rag_app
  WITH CHECK (created_by_sub = actor_sub() AND deleted_at IS NULL AND is_tenant_member(tenant_id));
CREATE POLICY conversations_update ON conversations FOR UPDATE TO rag_app
  USING (created_by_sub = actor_sub() AND deleted_at IS NULL AND is_tenant_member(tenant_id))
  WITH CHECK (created_by_sub = actor_sub() AND is_tenant_member(tenant_id));

-- Evaluation datasets/cases/runs: allow tenant managers to collaborate & prevent demoted viewers from mutating
DROP POLICY IF EXISTS datasets_owner ON evaluation_datasets;
DROP POLICY IF EXISTS datasets_select ON evaluation_datasets;
DROP POLICY IF EXISTS datasets_manage ON evaluation_datasets;
CREATE POLICY datasets_select ON evaluation_datasets FOR SELECT TO rag_app
  USING (is_tenant_manager(tenant_id) OR (created_by_sub = actor_sub() AND is_tenant_member(tenant_id)));
CREATE POLICY datasets_manage ON evaluation_datasets FOR ALL TO rag_app
  USING (is_tenant_manager(tenant_id))
  WITH CHECK (is_tenant_manager(tenant_id));
GRANT DELETE ON evaluation_datasets, evaluation_cases TO rag_app;

DROP POLICY IF EXISTS cases_owner ON evaluation_cases;
DROP POLICY IF EXISTS cases_manage ON evaluation_cases;
CREATE POLICY cases_manage ON evaluation_cases TO rag_app
  USING (EXISTS (SELECT 1 FROM evaluation_datasets d WHERE d.id = dataset_id AND is_tenant_manager(d.tenant_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM evaluation_datasets d WHERE d.id = dataset_id AND is_tenant_manager(d.tenant_id)));

DROP POLICY IF EXISTS runs_owner ON evaluation_runs;
DROP POLICY IF EXISTS runs_manage ON evaluation_runs;
CREATE POLICY runs_manage ON evaluation_runs TO rag_app
  USING (EXISTS (SELECT 1 FROM evaluation_datasets d WHERE d.id = dataset_id AND is_tenant_manager(d.tenant_id)))
  WITH CHECK (created_by_sub = actor_sub() AND EXISTS (SELECT 1 FROM evaluation_datasets d WHERE d.id = dataset_id AND is_tenant_manager(d.tenant_id)));

DROP POLICY IF EXISTS results_owner ON evaluation_results;
DROP POLICY IF EXISTS results_manage ON evaluation_results;
CREATE POLICY results_manage ON evaluation_results TO rag_app
  USING (EXISTS (SELECT 1 FROM evaluation_runs r JOIN evaluation_datasets d ON d.id = r.dataset_id WHERE r.id = run_id AND is_tenant_manager(d.tenant_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM evaluation_runs r JOIN evaluation_datasets d ON d.id = r.dataset_id WHERE r.id = run_id AND is_tenant_manager(d.tenant_id)));

-- Flexible embedding dimensions (supports Qwen3-Embedding-0.6B at 1024d AND nomic-embed-text at 768d)
DROP INDEX IF EXISTS chunks_vector_hnsw_idx;
ALTER TABLE document_chunks ALTER COLUMN vector TYPE vector;
ALTER TABLE document_chunks ADD COLUMN IF NOT EXISTS embedding_model text;
CREATE INDEX IF NOT EXISTS chunks_vector_768_hnsw_idx
  ON document_chunks USING hnsw ((vector::vector(768)) vector_cosine_ops)
  WHERE vector IS NOT NULL AND vector_dims(vector) = 768;
CREATE INDEX IF NOT EXISTS chunks_vector_1024_hnsw_idx
  ON document_chunks USING hnsw ((vector::vector(1024)) vector_cosine_ops)
  WHERE vector IS NOT NULL AND vector_dims(vector) = 1024;

-- Worker audit & quarantine purge ability for security events (e.g. ClamAV malware quarantine purge)
GRANT INSERT ON audit_events TO rag_worker;
GRANT INSERT ON storage_deletions TO rag_worker;
DROP POLICY IF EXISTS worker_audit_insert ON audit_events;
CREATE POLICY worker_audit_insert ON audit_events FOR INSERT TO rag_worker WITH CHECK (true);

-- Transactional Outbox & Worker Idempotency tables (Vigilio async-workers pattern)
CREATE TABLE IF NOT EXISTS outbox_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  topic text NOT NULL CHECK (length(topic) BETWEEN 3 AND 80),
  aggregate_id uuid NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'dispatched', 'failed')),
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  lease_expires_at timestamptz,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  dispatched_at timestamptz
);
CREATE INDEX IF NOT EXISTS outbox_events_pending_idx ON outbox_events(status, next_attempt_at, created_at)
  WHERE status IN ('pending', 'processing');

CREATE TABLE IF NOT EXISTS processed_events (
  event_key text PRIMARY KEY CHECK (length(event_key) BETWEEN 3 AND 200),
  topic text NOT NULL,
  processed_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE outbox_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE processed_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS outbox_app_insert ON outbox_events;
DROP POLICY IF EXISTS outbox_manager_select ON outbox_events;
DROP POLICY IF EXISTS outbox_manager_replay ON outbox_events;
DROP POLICY IF EXISTS outbox_worker_all ON outbox_events;
DROP POLICY IF EXISTS processed_worker_all ON processed_events;
CREATE POLICY outbox_app_insert ON outbox_events FOR INSERT TO rag_app
  WITH CHECK (is_tenant_member(tenant_id));
CREATE POLICY outbox_manager_select ON outbox_events FOR SELECT TO rag_app
  USING (is_tenant_manager(tenant_id));
CREATE POLICY outbox_manager_replay ON outbox_events FOR UPDATE TO rag_app
  USING (is_tenant_manager(tenant_id))
  WITH CHECK (is_tenant_manager(tenant_id));
CREATE POLICY outbox_worker_all ON outbox_events TO rag_worker USING (true) WITH CHECK (true);
CREATE POLICY processed_worker_all ON processed_events TO rag_worker USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE ON outbox_events TO rag_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON outbox_events TO rag_worker;
GRANT SELECT, INSERT, DELETE ON processed_events TO rag_worker;

-- Enforce FORCE ROW LEVEL SECURITY across every tenant/domain table
ALTER TABLE users FORCE ROW LEVEL SECURITY;
ALTER TABLE tenants FORCE ROW LEVEL SECURITY;
ALTER TABLE memberships FORCE ROW LEVEL SECURITY;
ALTER TABLE knowledge_bases FORCE ROW LEVEL SECURITY;
ALTER TABLE documents FORCE ROW LEVEL SECURITY;
ALTER TABLE document_chunks FORCE ROW LEVEL SECURITY;
ALTER TABLE ingestion_jobs FORCE ROW LEVEL SECURITY;
ALTER TABLE document_versions FORCE ROW LEVEL SECURITY;
ALTER TABLE document_grants FORCE ROW LEVEL SECURITY;
ALTER TABLE conversations FORCE ROW LEVEL SECURITY;
ALTER TABLE messages FORCE ROW LEVEL SECURITY;
ALTER TABLE answer_citations FORCE ROW LEVEL SECURITY;
ALTER TABLE evaluation_datasets FORCE ROW LEVEL SECURITY;
ALTER TABLE evaluation_cases FORCE ROW LEVEL SECURITY;
ALTER TABLE evaluation_runs FORCE ROW LEVEL SECURITY;
ALTER TABLE evaluation_results FORCE ROW LEVEL SECURITY;
ALTER TABLE usage_events FORCE ROW LEVEL SECURITY;
ALTER TABLE tenant_budgets FORCE ROW LEVEL SECURITY;
ALTER TABLE audit_events FORCE ROW LEVEL SECURITY;
ALTER TABLE access_groups FORCE ROW LEVEL SECURITY;
ALTER TABLE access_group_memberships FORCE ROW LEVEL SECURITY;
ALTER TABLE document_group_grants FORCE ROW LEVEL SECURITY;
ALTER TABLE answer_evidence FORCE ROW LEVEL SECURITY;
ALTER TABLE storage_deletions FORCE ROW LEVEL SECURITY;
ALTER TABLE outbox_events FORCE ROW LEVEL SECURITY;
ALTER TABLE processed_events FORCE ROW LEVEL SECURITY;

-- Allow knowledge base deletion to cascade to its documents, conversations and datasets
ALTER TABLE documents
  DROP CONSTRAINT IF EXISTS documents_knowledge_base_id_tenant_id_fkey,
  ADD CONSTRAINT documents_knowledge_base_id_tenant_id_fkey
    FOREIGN KEY (knowledge_base_id, tenant_id) REFERENCES knowledge_bases(id, tenant_id) ON DELETE CASCADE;

ALTER TABLE conversations
  DROP CONSTRAINT IF EXISTS conversations_knowledge_base_id_tenant_id_fkey,
  ADD CONSTRAINT conversations_knowledge_base_id_tenant_id_fkey
    FOREIGN KEY (knowledge_base_id, tenant_id) REFERENCES knowledge_bases(id, tenant_id) ON DELETE CASCADE;

ALTER TABLE evaluation_datasets
  DROP CONSTRAINT IF EXISTS evaluation_datasets_knowledge_base_id_tenant_id_fkey,
  ADD CONSTRAINT evaluation_datasets_knowledge_base_id_tenant_id_fkey
    FOREIGN KEY (knowledge_base_id, tenant_id) REFERENCES knowledge_bases(id, tenant_id) ON DELETE CASCADE;

ALTER TABLE evaluation_runs
  DROP CONSTRAINT IF EXISTS evaluation_runs_dataset_id_fkey,
  ADD CONSTRAINT evaluation_runs_dataset_id_fkey
    FOREIGN KEY (dataset_id) REFERENCES evaluation_datasets(id) ON DELETE CASCADE;

ALTER TABLE evaluation_results
  DROP CONSTRAINT IF EXISTS evaluation_results_case_id_fkey,
  ADD CONSTRAINT evaluation_results_case_id_fkey
    FOREIGN KEY (case_id) REFERENCES evaluation_cases(id) ON DELETE CASCADE;

ALTER TABLE ingestion_jobs
  DROP CONSTRAINT IF EXISTS ingestion_jobs_document_id_fkey,
  ADD CONSTRAINT ingestion_jobs_document_id_fkey
    FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE;

ALTER TABLE storage_deletions
  ALTER COLUMN document_id DROP NOT NULL,
  DROP CONSTRAINT IF EXISTS storage_deletions_document_id_fkey,
  ADD CONSTRAINT storage_deletions_document_id_fkey
    FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE SET NULL;

-- Ensure physical S3 object erasure survives hard-deletion of documents (e.g. KB cascade delete by owner/admin)
CREATE OR REPLACE FUNCTION enqueue_document_storage_deletion() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF OLD.file_path IS NOT NULL THEN
    INSERT INTO storage_deletions(document_id, object_key)
    VALUES (NULL, OLD.file_path)
    ON CONFLICT (object_key) DO UPDATE SET document_id = NULL;
  END IF;
  RETURN OLD;
END;
$$;
REVOKE ALL ON FUNCTION enqueue_document_storage_deletion() FROM PUBLIC;

DROP TRIGGER IF EXISTS documents_enqueue_storage_deletion_trg ON documents;
CREATE TRIGGER documents_enqueue_storage_deletion_trg
  BEFORE DELETE ON documents
  FOR EACH ROW
  EXECUTE FUNCTION enqueue_document_storage_deletion();

