#!/usr/bin/env bash
# Encrypted offsite backup for Rootless Podman / Compose deployments:
# Backs up `rag` DB (preserving rag_app / rag_worker GRANT ACLs + RLS), `keycloak` DB, and RustFS objects.
set -euo pipefail

ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)
DEPLOY="${DEPLOY_DIR:-$ROOT/enterprise-rag-deploy}"

: "${BACKUP_AGE_RECIPIENT:?age X25519 public recipient required}"
: "${BACKUP_OFFSITE_DEST:?SSH rsync destination is required}"

command -v age >/dev/null || { echo 'age required' >&2; exit 1; }
command -v rsync >/dev/null || { echo 'rsync required' >&2; exit 1; }

if command -v podman >/dev/null 2>&1; then
  COMPOSE_BIN="${COMPOSE_BIN:-podman compose}"
elif command -v docker >/dev/null 2>&1; then
  COMPOSE_BIN="${COMPOSE_BIN:-docker compose}"
else
  echo 'podman compose or docker compose required' >&2
  exit 1
fi

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUT_DIR="${BACKUP_DIR:-$DEPLOY/backups}"
mkdir -p "$OUT_DIR"
chmod 700 "$OUT_DIR"

RAG_DEST="$OUT_DIR/rag-${STAMP}.dump.age"
KC_DEST="$OUT_DIR/keycloak-${STAMP}.dump.age"
RUSTFS_DEST="$OUT_DIR/rustfs-${STAMP}.tar.zst.age"

cd "$DEPLOY"

# 1. Logical dump of `rag` preserving role ACLs (never pass --no-privileges / --no-acl)
$COMPOSE_BIN --env-file .env -f compose/compose.yaml exec -T postgres \
  pg_dump -U postgres -d rag --format=custom --no-owner \
  | age -r "$BACKUP_AGE_RECIPIENT" -o "$RAG_DEST"
sha256sum "$RAG_DEST" > "$RAG_DEST.sha256"

# 2. Logical dump of `keycloak` identity database
$COMPOSE_BIN --env-file .env -f compose/compose.yaml exec -T postgres \
  pg_dump -U postgres -d keycloak --format=custom --no-owner \
  | age -r "$BACKUP_AGE_RECIPIENT" -o "$KC_DEST"
sha256sum "$KC_DEST" > "$KC_DEST.sha256"

# 3. Encrypted stream of RustFS private object store volume
$COMPOSE_BIN --env-file .env -f compose/compose.yaml exec -T rustfs \
  tar -cf - /data 2>/dev/null \
  | age -r "$BACKUP_AGE_RECIPIENT" -o "$RUSTFS_DEST"
sha256sum "$RUSTFS_DEST" > "$RUSTFS_DEST.sha256"

rsync --archive --protect-args --rsh='ssh -o StrictHostKeyChecking=yes -o BatchMode=yes' \
  "$RAG_DEST" "$RAG_DEST.sha256" \
  "$KC_DEST" "$KC_DEST.sha256" \
  "$RUSTFS_DEST" "$RUSTFS_DEST.sha256" \
  "$BACKUP_OFFSITE_DEST"

echo "Encrypted backups (rag + keycloak + rustfs) transferred: $STAMP"
