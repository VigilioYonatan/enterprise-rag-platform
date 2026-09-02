#!/bin/sh
set -eu
: "${MIGRATION_DATABASE_URL:?Provide privileged test database URL; never run on production}"
SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
psql "$MIGRATION_DATABASE_URL" -X -v ON_ERROR_STOP=1 -f "$SCRIPT_DIR/../../apps/enterprise-rag-impl/test/sql/security-rls.sql"
psql "$MIGRATION_DATABASE_URL" -X -v ON_ERROR_STOP=1 -f "$SCRIPT_DIR/../../apps/enterprise-rag-impl/test/sql/security-member-directory.sql"
psql "$MIGRATION_DATABASE_URL" -X -v ON_ERROR_STOP=1 -f "$SCRIPT_DIR/../../apps/enterprise-rag-impl/test/sql/security-group-and-delete.sql"
psql "$MIGRATION_DATABASE_URL" -X -v ON_ERROR_STOP=1 -f "$SCRIPT_DIR/../../apps/enterprise-rag-impl/test/sql/security-finops-and-roles.sql"
