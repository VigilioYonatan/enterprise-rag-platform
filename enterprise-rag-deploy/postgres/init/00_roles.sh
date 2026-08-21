#!/usr/bin/env bash
set -euo pipefail
: "${POSTGRES_PASSWORD:?missing password}"
: "${APP_DB_PASSWORD:?missing app DB password}"
: "${WORKER_DB_PASSWORD:?missing worker password}"
: "${KEYCLOAK_DB_PASSWORD:?missing keycloak password}"
# Entrypoint runs this script as postgres superuser only on first DB initialization.
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB"   -v app_password="$APP_DB_PASSWORD" -v worker_password="$WORKER_DB_PASSWORD" -v kc_password="$KEYCLOAK_DB_PASSWORD" <<'SQL'
SELECT format('CREATE ROLE rag_app LOGIN PASSWORD %L', :'app_password') WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='rag_app') \gexec
SELECT format('CREATE ROLE rag_worker LOGIN PASSWORD %L', :'worker_password') WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='rag_worker') \gexec
SELECT format('CREATE ROLE keycloak LOGIN PASSWORD %L', :'kc_password') WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='keycloak') \gexec
GRANT CONNECT ON DATABASE rag TO rag_app,rag_worker;
GRANT USAGE ON SCHEMA public TO rag_app,rag_worker;
SELECT 'CREATE DATABASE keycloak OWNER keycloak' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname='keycloak') \gexec
SQL
