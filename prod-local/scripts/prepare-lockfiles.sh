#!/bin/sh
set -eu
ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)
for APP in "$ROOT/apps/enterprise-rag-impl" "$ROOT/apps/enterprise-rag-web"; do
  echo "Resolving audited dependency tree in $APP (online npm registry required)"
  (cd "$APP" && npm install --package-lock-only --ignore-scripts --no-audit --no-fund)
  (cd "$APP" && npm ci --no-audit --no-fund && npm run typecheck && npm run build && npm test)
done
echo 'Lockfiles created and project checks executed; review dependency inventory, npm audit and commit locks before any release.'
