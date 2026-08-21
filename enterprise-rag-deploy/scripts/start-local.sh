#!/bin/sh
set -eu
cd "$(dirname "$0")/.."

if [ ! -f .env ]; then
  echo 'Copy .env.example to .env and set strong secrets first' >&2
  exit 1
fi

if [ -z "${COMPOSE:-}" ]; then
  if command -v podman >/dev/null 2>&1; then
    COMPOSE="podman compose"
  else
    COMPOSE="docker compose"
  fi
fi

set -a
. ./.env
set +a

$COMPOSE --env-file .env -f compose/compose.yaml config >/dev/null
$COMPOSE --env-file .env -f compose/compose.yaml --profile development up -d postgres mailpit keycloak clamav valkey rustfs

if [ "${START_LOCAL_LLM:-true}" = 'true' ]; then
  $COMPOSE --env-file .env -f compose/compose.yaml --profile llm up -d ollama
  if [ "${PULL_LOCAL_MODELS:-true}" = 'true' ]; then
    $COMPOSE --env-file .env -f compose/compose.yaml --profile llm exec -T ollama ollama pull "${OLLAMA_GENERATION_MODEL:-gemma3:4b}"
    $COMPOSE --env-file .env -f compose/compose.yaml --profile llm exec -T ollama ollama pull "${OLLAMA_EMBED_MODEL:-qwen3-embedding:0.6b}"
  fi
fi

# One-shot SQL migration and RustFS private bucket setup
$COMPOSE --env-file .env -f compose/compose.yaml --profile tools run --rm --build migrate
$COMPOSE --env-file .env -f compose/compose.yaml --profile tools run --rm --build platform-setup

$COMPOSE --env-file .env -f compose/compose.yaml up -d --build api outbox worker web caddy
printf '%s\n' 'Local Rootless Podman / Compose stack launched. Verify http://127.0.0.1:8080/api/v1/health/ready.'
