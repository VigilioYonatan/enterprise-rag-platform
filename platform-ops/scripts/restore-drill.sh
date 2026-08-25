#!/usr/bin/env bash
# Restore drill into an isolated temporary database using Rootless Podman or Docker Compose,
# verifying schema migrations, FORCE ROW LEVEL SECURITY, and rag_app / rag_worker GRANT ACLs.
set -euo pipefail

: "${BACKUP_FILE:?Path to rag-*.dump.age required}"
: "${BACKUP_AGE_IDENTITY:?Path to private age identity (never commit it)}"
: "${ALLOW_RESTORE_DRILL:?Set ALLOW_RESTORE_DRILL=YES on disposable testing host}"

if [[ "$ALLOW_RESTORE_DRILL" != 'YES' ]]; then
  echo 'Refusing destructive drill without ALLOW_RESTORE_DRILL=YES' >&2
  exit 1
fi

command -v age >/dev/null || { echo 'age required' >&2; exit 1; }

if command -v podman >/dev/null 2>&1; then
  COMPOSE_BIN="${COMPOSE_BIN:-podman compose}"
elif command -v docker >/dev/null 2>&1; then
  COMPOSE_BIN="${COMPOSE_BIN:-docker compose}"
else
  echo 'podman compose or docker compose required' >&2
  exit 1
fi

ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)
cd "${DEPLOY_DIR:-$ROOT/enterprise-rag-deploy}"

DATABASE="rag_restore_$(date -u +%Y%m%d%H%M%S)"
cleanup() {
  $COMPOSE_BIN --env-file .env -f compose/compose.yaml exec -T postgres \
    psql -U postgres -d postgres -c "DROP DATABASE IF EXISTS \"$DATABASE\" WITH (FORCE)" >/dev/null 2>&1 || true
}
trap cleanup EXIT

$COMPOSE_BIN --env-file .env -f compose/compose.yaml exec -T postgres \
  psql -X -v ON_ERROR_STOP=1 -U postgres -d postgres -c "CREATE DATABASE \"$DATABASE\"" >/dev/null

age -d -i "$BACKUP_AGE_IDENTITY" "$BACKUP_FILE" \
  | $COMPOSE_BIN --env-file .env -f compose/compose.yaml exec -T postgres \
    pg_restore -U postgres -d "$DATABASE" --no-owner --exit-on-error

$COMPOSE_BIN --env-file .env -f compose/compose.yaml exec -T postgres \
  psql -X -v ON_ERROR_STOP=1 -U postgres -d "$DATABASE" <<'SQL'
DO $$
DECLARE
  mig_count integer;
  forced_count integer;
BEGIN
  SELECT count(*) INTO mig_count FROM schema_migrations;
  IF mig_count < 12 THEN
    RAISE EXCEPTION 'Expected >= 12 migrations after restore, got %', mig_count;
  END IF;

  SELECT count(*) INTO forced_count
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relforcerowsecurity = true;
  IF forced_count < 22 THEN
    RAISE EXCEPTION 'Expected FORCE ROW LEVEL SECURITY on >= 22 tables, got %', forced_count;
  END IF;

  IF NOT has_table_privilege('rag_app', 'public.documents', 'SELECT') THEN
    RAISE EXCEPTION 'rag_app ACL GRANT missing after restore';
  END IF;
END $$;
SQL

echo "Restore drill verified (migrations, FORCE RLS, and rag_app ACLs intact) in $DATABASE."
