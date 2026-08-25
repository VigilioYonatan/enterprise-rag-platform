#!/usr/bin/env bash
# Continuous WAL Archiving & Point-In-Time Recovery (PITR) wrapper via pgBackRest.
set -euo pipefail

STANZA="${PGBACKREST_STANZA:-primary-db}"
ACTION="${1:-check}"

command -v pgbackrest >/dev/null 2>&1 || {
  echo 'pgbackrest binary is required on the database host' >&2
  exit 1
}

case "$ACTION" in
  stanza-create)
    pgbackrest --stanza="$STANZA" stanza-create
    pgbackrest --stanza="$STANZA" check
    ;;
  backup-full)
    pgbackrest --stanza="$STANZA" --type=full backup
    ;;
  backup-incr)
    pgbackrest --stanza="$STANZA" --type=incr backup
    ;;
  check)
    pgbackrest --stanza="$STANZA" check
    pgbackrest --stanza="$STANZA" info
    ;;
  restore-pitr)
    : "${PITR_TARGET_TIME:?Set PITR_TARGET_TIME (e.g. '2026-11-07 14:00:00+00') for point-in-time recovery}"
    : "${ALLOW_PITR_RESTORE:?Set ALLOW_PITR_RESTORE=YES after stopping PostgreSQL service}"
    [ "$ALLOW_PITR_RESTORE" = "YES" ] || exit 1
    pgbackrest --stanza="$STANZA" --delta --type=time "--target=$PITR_TARGET_TIME" --target-action=promote restore
    ;;
  *)
    echo "Usage: $0 {stanza-create|backup-full|backup-incr|check|restore-pitr}" >&2
    exit 1
    ;;
esac
