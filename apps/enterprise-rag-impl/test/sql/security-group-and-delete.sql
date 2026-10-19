-- Run ONLY on an ephemeral migrated database. Fixtures are rolled back.
BEGIN;
INSERT INTO users(sub,email) VALUES ('r3-owner','r3-o@local.test'),('r3-peer','r3-p@local.test'),('r3-other','r3-x@local.test') ON CONFLICT DO NOTHING;
INSERT INTO tenants(id,name,created_by_sub) VALUES
 ('e3000000-0000-4000-8000-000000000001','R3 Tenant A','r3-owner'),
 ('e3000000-0000-4000-8000-000000000002','R3 Tenant B','r3-other') ON CONFLICT DO NOTHING;
INSERT INTO memberships(tenant_id,user_sub,role) VALUES
 ('e3000000-0000-4000-8000-000000000001','r3-owner','owner'),
 ('e3000000-0000-4000-8000-000000000001','r3-peer','viewer'),
 ('e3000000-0000-4000-8000-000000000002','r3-other','owner') ON CONFLICT DO NOTHING;
INSERT INTO knowledge_bases(id,tenant_id,name,created_by_sub) VALUES
 ('e3000000-0000-4000-8000-000000000003','e3000000-0000-4000-8000-000000000001','Audit R3 KB','r3-owner') ON CONFLICT DO NOTHING;
INSERT INTO documents(id,tenant_id,knowledge_base_id,owner_sub,title,body,visibility,status) VALUES
 ('e3000000-0000-4000-8000-000000000004','e3000000-0000-4000-8000-000000000001',
 'e3000000-0000-4000-8000-000000000003','r3-owner','Private R3','confidential','private','ready') ON CONFLICT DO NOTHING;
INSERT INTO document_chunks(id,tenant_id,document_id,ordinal,content) VALUES
 ('e3000000-0000-4000-8000-000000000005','e3000000-0000-4000-8000-000000000001',
 'e3000000-0000-4000-8000-000000000004',0,'SECRET-NEVER-LEAK') ON CONFLICT DO NOTHING;
INSERT INTO access_groups(id,tenant_id,name) VALUES
 ('e3000000-0000-4000-8000-000000000006','e3000000-0000-4000-8000-000000000001','Auditors') ON CONFLICT DO NOTHING;
INSERT INTO access_group_memberships(group_id,tenant_id,user_sub) VALUES
 ('e3000000-0000-4000-8000-000000000006','e3000000-0000-4000-8000-000000000001','r3-peer') ON CONFLICT DO NOTHING;
SET ROLE rag_app;
SELECT set_config('app.actor_sub','r3-peer',true);
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM document_chunks WHERE content='SECRET-NEVER-LEAK') THEN
  RAISE EXCEPTION 'Same tenant peer leaked private chunk without grant'; END IF;
END $$;
RESET ROLE;
INSERT INTO document_group_grants(document_id,group_id,tenant_id,created_by_sub) VALUES
 ('e3000000-0000-4000-8000-000000000004','e3000000-0000-4000-8000-000000000006',
  'e3000000-0000-4000-8000-000000000001','r3-owner') ON CONFLICT DO NOTHING;
SET ROLE rag_app;
DO $$ BEGIN
 IF (SELECT count(*) FROM document_chunks WHERE content='SECRET-NEVER-LEAK')<>1 THEN
  RAISE EXCEPTION 'Granted group cannot see authorized document'; END IF;
END $$;
SELECT set_config('app.actor_sub','r3-other',true);
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM document_chunks WHERE content='SECRET-NEVER-LEAK') THEN
  RAISE EXCEPTION 'Cross-tenant document leaked despite group permission'; END IF;
END $$;
RESET ROLE;
DELETE FROM document_group_grants WHERE document_id='e3000000-0000-4000-8000-000000000004';
SET ROLE rag_app;
SELECT set_config('app.actor_sub','r3-peer',true);
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM document_chunks WHERE content='SECRET-NEVER-LEAK') THEN
  RAISE EXCEPTION 'Revoked group grant still exposes chunk'; END IF;
END $$;
RESET ROLE;
ROLLBACK;
