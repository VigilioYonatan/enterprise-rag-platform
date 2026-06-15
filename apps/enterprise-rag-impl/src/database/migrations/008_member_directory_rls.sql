-- Tenant-scoped member directory. Never expose the global users table.
-- A manager can read profiles of people already in their tenant; everyone can see self.
DROP POLICY IF EXISTS users_self ON users;
CREATE POLICY users_read ON users FOR SELECT TO rag_app USING (
 sub=actor_sub() OR EXISTS (
  SELECT 1 FROM memberships own JOIN memberships peer ON peer.tenant_id=own.tenant_id
  WHERE own.user_sub=actor_sub() AND peer.user_sub=users.sub
  AND is_tenant_manager(own.tenant_id)
 )
);
CREATE POLICY users_insert ON users FOR INSERT TO rag_app WITH CHECK (sub=actor_sub());
CREATE POLICY users_update ON users FOR UPDATE TO rag_app USING (sub=actor_sub()) WITH CHECK (sub=actor_sub());
-- Explicit enrollment lookup: only an owner/admin of this particular tenant may
-- resolve an existing user by email. The manager's tenant ID is mandatory.
CREATE OR REPLACE FUNCTION find_existing_user_for_tenant(t uuid,target_email text)
RETURNS TABLE(user_sub text)
LANGUAGE sql SECURITY DEFINER STABLE SET search_path=public AS $$
 SELECT u.sub FROM users u
 WHERE is_tenant_manager(t) AND lower(u.email)=lower(target_email)
 LIMIT 2
$$;
REVOKE ALL ON FUNCTION find_existing_user_for_tenant(uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION find_existing_user_for_tenant(uuid,text) TO rag_app;
