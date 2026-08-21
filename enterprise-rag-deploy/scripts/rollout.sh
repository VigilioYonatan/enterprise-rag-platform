#!/bin/sh
set -eu
cd "$(dirname "$0")/.."

if [ ! -r .env ]; then
  echo 'Missing deployment .env' >&2
  exit 1
fi

set -a
. ./.env
set +a

./scripts/release-verify.sh

if [ -z "${COMPOSE:-}" ]; then
  if command -v podman >/dev/null 2>&1; then
    COMPOSE="podman compose"
  else
    COMPOSE="docker compose"
  fi
fi

# Record currently running images for automatic rollback on healthcheck failure
PREV_STATE_FILE=".rollout-previous.env"
if [ -f ".rollout-active.env" ]; then
  cp ".rollout-active.env" "$PREV_STATE_FILE"
fi

$COMPOSE --env-file .env -f compose/compose.yaml config >/dev/null

# 1. Ensure stateful data-plane services are healthy
$COMPOSE --env-file .env -f compose/compose.yaml up --no-build -d postgres rustfs valkey clamav keycloak

# 2. Run one-shot SQL migrations and RustFS private bucket provisioning
$COMPOSE --env-file .env -f compose/compose.yaml --profile tools run --rm --no-build migrate
$COMPOSE --env-file .env -f compose/compose.yaml --profile tools run --rm --no-build platform-setup

# 3. Promote stateless application workloads by digest
$COMPOSE --env-file .env -f compose/compose.yaml up --no-build --pull always -d api outbox worker web caddy

# 4. Verify /api/v1/health/ready; rollback on failure
HEALTH_URL="${ROLLOUT_HEALTH_URL:-http://127.0.0.1:8080/api/v1/health/ready}"
attempt=0
healthy=false
while [ "$attempt" -lt 20 ]; do
  attempt=$((attempt + 1))
  if curl -fsS "$HEALTH_URL" >/dev/null 2>&1; then
    healthy=true
    break
  fi
  sleep 3
done

if [ "$healthy" != "true" ]; then
  echo "Rollout readiness gate failed at $HEALTH_URL" >&2
  if [ -f "$PREV_STATE_FILE" ]; then
    echo "Rolling back to previous verified image digests..." >&2
    $COMPOSE --env-file "$PREV_STATE_FILE" -f compose/compose.yaml up --no-build -d api outbox worker web caddy || true
  fi
  exit 1
fi

cp .env .rollout-active.env
chmod 600 .rollout-active.env
$COMPOSE --env-file .env -f compose/compose.yaml ps
printf '%s\n' 'Rollout completed and /api/v1/health/ready verified.'
