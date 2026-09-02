#!/bin/sh
set -eu
: "${BASE_URL:=http://localhost:8080}"
code="$(curl -sS -o /dev/null -w '%{http_code}' "$BASE_URL/api/v1/health/ready")"
[ "$code" = 200 ] || { echo "health failed: $code"; exit 1; }
echo 'Health PASS — authorization still requires integration testing.'
