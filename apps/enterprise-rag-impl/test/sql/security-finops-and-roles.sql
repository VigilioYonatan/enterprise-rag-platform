-- Security, RLS & FinOps integration assertions for 012_v6_senior_hardening.sql
BEGIN;

INSERT INTO users(sub, email) VALUES
  ('sec-owner', 'sec-owner@atlas.invalid'),
  ('sec-admin', 'sec-admin@atlas.invalid'),
  ('sec-viewer', 'sec-viewer@atlas.invalid');

INSERT INTO tenants(id, name, created_by_sub)
VALUES ('99999999-9999-4999-8999-999999999991', 'Hardened Tenant', 'sec-owner');

INSERT INTO memberships(tenant_id, user_sub, role) VALUES
  ('99999999-9999-4999-8999-999999999991', 'sec-owner', 'owner'),
  ('99999999-9999-4999-8999-999999999991', 'sec-admin', 'admin'),
  ('99999999-9999-4999-8999-999999999991', 'sec-viewer', 'viewer');

INSERT INTO knowledge_bases(id, tenant_id, name, created_by_sub)
VALUES ('99999999-9999-4999-8999-999999999992', '99999999-9999-4999-8999-999999999991', 'Hardened KB', 'sec-owner');

INSERT INTO tenant_budgets(tenant_id, daily_answer_limit, daily_cost_limit_usd)
VALUES ('99999999-9999-4999-8999-999999999991', 1, 10.00);

SET LOCAL ROLE rag_app;

-- 1. Readiness function succeeds for rag_app without superuser privileges
DO $$
BEGIN
  IF NOT is_schema_ready('012_v6_senior_hardening.sql') THEN
    RAISE EXCEPTION 'Expected 012_v6_senior_hardening.sql to be marked ready';
  END IF;
END $$;

-- 2. Admin cannot self-promote to owner (closes P0 privilege escalation)
SELECT set_config('app.actor_sub', 'sec-admin', true);
DO $$
DECLARE
  promoted integer;
BEGIN
  UPDATE memberships SET role = 'owner'
  WHERE tenant_id = '99999999-9999-4999-8999-999999999991' AND user_sub = 'sec-admin';
  GET DIAGNOSTICS promoted = ROW_COUNT;
  IF promoted > 0 THEN
    RAISE EXCEPTION 'Admin must not be able to promote to owner';
  END IF;
EXCEPTION WHEN insufficient_privilege THEN
  NULL;
END $$;

-- 3. Viewer FinOps budget reservation enforces daily_answer_limit = 1 across concurrent/sequential calls
SELECT set_config('app.actor_sub', 'sec-viewer', true);
DO $$
DECLARE
  u1 uuid;
  blocked boolean := false;
BEGIN
  u1 := reserve_tenant_answer_budget('99999999-9999-4999-8999-999999999992', 'qwen2.5:3b', 0.01);
  PERFORM finalize_tenant_answer_usage(u1, 100, 50, 250, 0.005);
  BEGIN
    PERFORM reserve_tenant_answer_budget('99999999-9999-4999-8999-999999999992', 'qwen2.5:3b', 0.01);
  EXCEPTION WHEN SQLSTATE 'P0029' THEN
    blocked := true;
  END;
  IF NOT blocked THEN
    RAISE EXCEPTION 'Expected second viewer answer to hit P0029 budget quota';
  END IF;
END $$;

-- 4. Intra-tenant conversation RLS isolation + owner soft-delete RETURNING
SELECT set_config('app.actor_sub', 'sec-owner', true);
INSERT INTO conversations(id, knowledge_base_id, tenant_id, created_by_sub, title)
VALUES (
  '99999999-9999-4999-8999-999999999994',
  '99999999-9999-4999-8999-999999999992',
  '99999999-9999-4999-8999-999999999991',
  'sec-owner',
  'Private Owner Thread'
);

SELECT set_config('app.actor_sub', 'sec-admin', true);
DO $$
DECLARE
  leaked integer;
BEGIN
  SELECT count(*)::int INTO leaked FROM conversations WHERE tenant_id = '99999999-9999-4999-8999-999999999991';
  IF leaked <> 0 THEN
    RAISE EXCEPTION 'Expected intra-tenant admin to see 0 private conversations of owner, got %', leaked;
  END IF;
END $$;

SELECT set_config('app.actor_sub', 'sec-owner', true);
DO $$
DECLARE
  deleted_id uuid;
BEGIN
  UPDATE conversations SET deleted_at = now()
  WHERE id = '99999999-9999-4999-8999-999999999994'
  RETURNING id INTO deleted_id;
  IF deleted_id IS NULL THEN
    RAISE EXCEPTION 'Expected conversation owner soft-delete RETURNING id to succeed';
  END IF;
END $$;

-- 5. Deleting a KB preserves S3 erasure records in storage_deletions even for private binary documents
SELECT set_config('app.actor_sub', 'sec-owner', true);
INSERT INTO documents(id, tenant_id, knowledge_base_id, owner_sub, title, body, visibility, status, file_path, byte_size)
VALUES (
  '99999999-9999-4999-8999-999999999993',
  '99999999-9999-4999-8999-999999999991',
  '99999999-9999-4999-8999-999999999992',
  'sec-owner',
  'Binary Secret PDF',
  '',
  'private',
  'ready',
  'clean/sec-erasure-proof.pdf',
  1024
);

SELECT set_config('app.actor_sub', 'sec-admin', true);
DELETE FROM knowledge_bases WHERE id = '99999999-9999-4999-8999-999999999992';

RESET ROLE;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM storage_deletions
    WHERE object_key = 'clean/sec-erasure-proof.pdf' AND document_id IS NULL AND status = 'pending'
  ) THEN
    RAISE EXCEPTION 'Expected storage_deletions row to survive KB cascade deletion for S3 GC erasure';
  END IF;
END $$;

-- 5. rag_worker can enqueue quarantined malware objects into storage_deletions and record audit_events
SET LOCAL ROLE rag_worker;
INSERT INTO storage_deletions(document_id, object_key)
VALUES (NULL, 'quarantine/eicar-malware-proof.bin');
INSERT INTO audit_events(tenant_id, actor_sub, action, target_type, target_id)
VALUES ('99999999-9999-4999-8999-999999999991', 'sec-owner', 'document.malware_blocked', 'document', 'quarantine-doc');
RESET ROLE;

ROLLBACK;
