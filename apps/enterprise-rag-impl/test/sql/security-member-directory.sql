-- Must be run as migration/superuser against an ephemeral DB with all migrations applied.
-- Tests RLS as rag_app while preserving the database with a rollback.
BEGIN;
INSERT INTO users(sub,email) VALUES ('member-audit-owner','owner@member.audit'),('member-audit-peer','peer@member.audit'),
 ('member-audit-stranger','stranger@member.audit') ON CONFLICT DO NOTHING;
INSERT INTO tenants(id,name,created_by_sub) VALUES
 ('e1000000-0000-4000-8000-000000000001','Member directory audit','member-audit-owner') ON CONFLICT DO NOTHING;
INSERT INTO memberships(tenant_id,user_sub,role) VALUES
 ('e1000000-0000-4000-8000-000000000001','member-audit-owner','owner'),
 ('e1000000-0000-4000-8000-000000000001','member-audit-peer','viewer') ON CONFLICT DO NOTHING;
SET ROLE rag_app;
SELECT set_config('app.actor_sub','member-audit-owner',true);
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM users WHERE sub='member-audit-peer') THEN
  RAISE EXCEPTION 'Manager cannot see profile of own tenant member'; END IF;
 IF EXISTS(SELECT 1 FROM users WHERE sub='member-audit-stranger') THEN
  RAISE EXCEPTION 'Manager can see unrelated user profile'; END IF;
 IF (SELECT count(*) FROM find_existing_user_for_tenant('e1000000-0000-4000-8000-000000000001','stranger@member.audit'))<>1 THEN
  RAISE EXCEPTION 'Authorized lookup cannot find signed-in user'; END IF;
END $$;
SELECT set_config('app.actor_sub','member-audit-peer',true);
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM users WHERE sub='member-audit-owner') THEN
  RAISE EXCEPTION 'Viewer can list other user profiles'; END IF;
 IF EXISTS(SELECT 1 FROM find_existing_user_for_tenant('e1000000-0000-4000-8000-000000000001','stranger@member.audit')) THEN
  RAISE EXCEPTION 'Non-manager user lookup succeeded'; END IF;
END $$;
RESET ROLE;
ROLLBACK;
