-- Run with: psql "$MIGRATION_DATABASE_URL" -v ON_ERROR_STOP=1 -f test/security-rls.sql
-- Requires schema migrations, runs in a transaction that is ROLLED BACK.
BEGIN;
INSERT INTO users(sub,email) VALUES
 ('test-owner-rag','owner@audit.local'),('test-viewer-rag','viewer@audit.local'),('test-outsider-rag','outsider@audit.local') ON CONFLICT DO NOTHING;
INSERT INTO tenants(id,name,created_by_sub) VALUES
 ('e0000000-0000-4000-8000-000000000001','Audit Tenant 1','test-owner-rag'),
 ('e0000000-0000-4000-8000-000000000002','Audit Tenant 2','test-outsider-rag') ON CONFLICT DO NOTHING;
INSERT INTO memberships(tenant_id,user_sub,role) VALUES
 ('e0000000-0000-4000-8000-000000000001','test-owner-rag','owner'),
 ('e0000000-0000-4000-8000-000000000001','test-viewer-rag','viewer'),
 ('e0000000-0000-4000-8000-000000000002','test-outsider-rag','owner') ON CONFLICT DO NOTHING;
INSERT INTO knowledge_bases(id,tenant_id,name,created_by_sub) VALUES
 ('e0000000-0000-4000-8000-000000000003','e0000000-0000-4000-8000-000000000001','Audit KB','test-owner-rag') ON CONFLICT DO NOTHING;
INSERT INTO documents(id,tenant_id,knowledge_base_id,owner_sub,title,body,visibility,status) VALUES
 ('e0000000-0000-4000-8000-000000000004','e0000000-0000-4000-8000-000000000001','e0000000-0000-4000-8000-000000000003','test-owner-rag','Private secret','secret','private','ready') ON CONFLICT DO NOTHING;
INSERT INTO document_chunks(id,tenant_id,document_id,ordinal,content) VALUES
 ('e0000000-0000-4000-8000-000000000005','e0000000-0000-4000-8000-000000000001','e0000000-0000-4000-8000-000000000004',0,'RESTRICTED AUDIT TEST') ON CONFLICT DO NOTHING;
SET ROLE rag_app;
SELECT set_config('app.actor_sub','test-viewer-rag',true);
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM document_chunks WHERE id='e0000000-0000-4000-8000-000000000005') THEN
  RAISE EXCEPTION 'FAIL: same tenant private document leaked to viewer';END IF;
END $$;
RESET ROLE;
INSERT INTO document_grants(document_id,tenant_id,user_sub,created_by_sub) VALUES
 ('e0000000-0000-4000-8000-000000000004','e0000000-0000-4000-8000-000000000001','test-viewer-rag','test-owner-rag');
SET ROLE rag_app;
DO $$ BEGIN
 IF (SELECT count(*) FROM document_chunks WHERE id='e0000000-0000-4000-8000-000000000005')<>1 THEN
  RAISE EXCEPTION 'FAIL: explicit same-tenant user grant not effective';END IF;
END $$;
RESET ROLE;
DELETE FROM document_grants WHERE document_id='e0000000-0000-4000-8000-000000000004';
SET ROLE rag_app;
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM document_chunks WHERE id='e0000000-0000-4000-8000-000000000005') THEN
  RAISE EXCEPTION 'FAIL: revoked user grant still exposes chunk';END IF;
END $$;
SELECT set_config('app.actor_sub','test-outsider-rag',true);
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM document_chunks WHERE id='e0000000-0000-4000-8000-000000000005') THEN
  RAISE EXCEPTION 'FAIL: cross-tenant chunk leak';END IF;
END $$;
RESET ROLE;
ROLLBACK;
