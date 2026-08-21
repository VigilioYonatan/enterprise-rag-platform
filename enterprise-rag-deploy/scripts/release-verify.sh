#!/bin/sh
set -eu
# Production Release Gate: verify secrets, HTTPS OIDC/DNS, realm hygiene, Cosign signatures, SBOM attestations and CVEs.
: "${RAG_API_IMAGE:?API image with @sha256 digest required}"
: "${RAG_WEB_IMAGE:?Web image with @sha256 digest required}"
: "${COSIGN_CERT_IDENTITY_REGEXP:?Expected CI OIDC identity regex required}"
: "${COSIGN_CERT_ISSUER:?Expected OIDC issuer required}"

# 1. Reject placeholder or weak secrets in .env
for secret_var in POSTGRES_PASSWORD APP_DB_PASSWORD WORKER_DB_PASSWORD KEYCLOAK_DB_PASSWORD \
  KEYCLOAK_ADMIN_PASSWORD RUSTFS_SECRET_KEY VALKEY_PASSWORD GRAFANA_ADMIN_PASSWORD; do
  eval "secret_val=\${$secret_var:-}"
  if [ -z "$secret_val" ]; then
    echo "Missing mandatory secret: $secret_var" >&2
    exit 1
  fi
  case "$secret_val" in
    *CHANGE_ME*|*REPLACE_ME*|*REPLACE_WITH*|*example*)
      echo "Placeholder secret refused in production for $secret_var" >&2
      exit 1
      ;;
  esac
done

[ "$APP_DB_PASSWORD" != "$POSTGRES_PASSWORD" ] || { echo 'APP_DB_PASSWORD must differ from superuser password' >&2; exit 1; }
[ "$WORKER_DB_PASSWORD" != "$POSTGRES_PASSWORD" ] || { echo 'WORKER_DB_PASSWORD must differ from superuser password' >&2; exit 1; }
[ "$KEYCLOAK_DB_PASSWORD" != "$POSTGRES_PASSWORD" ] || { echo 'KEYCLOAK_DB_PASSWORD must differ from superuser password' >&2; exit 1; }

# 2. Enforce production Keycloak & HTTPS configuration
[ "${KEYCLOAK_START_MODE:-}" = 'start' ] || { echo 'Production requires KEYCLOAK_START_MODE=start' >&2; exit 1; }
case "${KEYCLOAK_HOSTNAME:-}" in https://*) ;; *) echo 'Keycloak hostname must be public HTTPS' >&2; exit 1 ;; esac
case "${OIDC_ISSUER:-}" in https://*/realms/*) ;; *) echo 'OIDC_ISSUER must be HTTPS' >&2; exit 1 ;; esac
case "${SITE_ADDRESS:-}" in *.*) ;; *) echo 'Public site hostname required' >&2; exit 1 ;; esac
[ "${CADDYFILE_PATH:-}" = '../caddy/Caddyfile.prod' ] || { echo 'Production Caddyfile required' >&2; exit 1; }
[ "${KEYCLOAK_REALM_FILE:-}" != '../keycloak/realm-enterprise.json' ] && [ -n "${KEYCLOAK_REALM_FILE:-}" ] || {
  echo 'Development realm not permitted in production' >&2
  exit 1
}
case "$KEYCLOAK_REALM_FILE" in
  *.example.json)
    echo 'Copy and configure the realm; example realm refused' >&2
    exit 1
    ;;
esac

REALM_ON_DISK="$(CDPATH= cd -- "$(dirname -- "$0")/../compose" && pwd)/$KEYCLOAK_REALM_FILE"
[ -r "$REALM_ON_DISK" ] || { echo 'Production realm file missing' >&2; exit 1; }
if grep -Eq 'example\.org|CHANGE_ME|REPLACE_WITH|mailpit|atlas\.local' "$REALM_ON_DISK"; then
  echo 'Production realm contains development SMTP/domains or placeholders' >&2
  exit 1
fi

if [ "${CLAMAV_REQUIRED:-true}" != 'true' ]; then
  echo 'CLAMAV_REQUIRED=true is mandatory for release' >&2
  exit 1
fi

# 3. Verify Cosign OIDC signatures, SPDX SBOM attestations and HIGH/CRITICAL CVEs
command -v cosign >/dev/null 2>&1 || { echo 'cosign required' >&2; exit 1; }
command -v trivy >/dev/null 2>&1 || { echo 'trivy required' >&2; exit 1; }

for image in "$RAG_API_IMAGE" "$RAG_WEB_IMAGE"; do
  case "$image" in
    *@sha256:*) ;;
    *)
      echo "Mutable or unsigned release image refused: $image" >&2
      exit 1
      ;;
  esac
  cosign verify \
    --certificate-identity-regexp "$COSIGN_CERT_IDENTITY_REGEXP" \
    --certificate-oidc-issuer "$COSIGN_CERT_ISSUER" \
    "$image" >/dev/null
  cosign verify-attestation \
    --type spdxjson \
    --certificate-identity-regexp "$COSIGN_CERT_IDENTITY_REGEXP" \
    --certificate-oidc-issuer "$COSIGN_CERT_ISSUER" \
    "$image" >/dev/null
  trivy image --exit-code 1 --severity HIGH,CRITICAL "$image"
done

# 4. Verify immutable @sha256 digests on all data-plane and observability vendor images
for var in POSTGRES_IMAGE KEYCLOAK_IMAGE VALKEY_IMAGE RUSTFS_IMAGE CADDY_IMAGE \
  CLAMAV_IMAGE PROMETHEUS_IMAGE ALERTMANAGER_IMAGE LOKI_IMAGE ALLOY_IMAGE \
  GRAFANA_IMAGE OTEL_COLLECTOR_IMAGE TEMPO_IMAGE OLLAMA_IMAGE; do
  eval "value=\${$var-}"
  echo "$value" | grep -Eq "@sha256:[0-9a-f]{64}$" || {
    echo "Production requires a real immutable digest for $var" >&2
    exit 1
  }
  trivy image --exit-code 1 --severity HIGH,CRITICAL "$value"
done

printf '%s\n' 'Secrets, realm hygiene, Cosign signatures, SBOM attestations and CVE gates passed.'
