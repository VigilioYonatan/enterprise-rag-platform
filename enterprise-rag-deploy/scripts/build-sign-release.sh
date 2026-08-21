#!/bin/sh
set -eu
# Vigilio Supply-Chain Release Pipeline:
# 1) Verify pnpm-lock.yaml + Containerfile/Dockerfile
# 2) Build image locally BEFORE pushing
# 3) Run Trivy HIGH/CRITICAL gate BEFORE registry push
# 4) Push immutable digest, generate SPDX SBOM, Cosign sign + Cosign attest SBOM
: "${OCI_REGISTRY_REPOSITORY:?e.g. ghcr.io/owner/enterprise-rag-api}"
: "${RELEASE_TAG:?immutable release tag/commit SHA required}"
: "${BUILD_CONTEXT:?absolute or relative path to audited app repository}"
: "${OUTPUT_DIR:?directory for CI artifacts}"

case "$RELEASE_TAG" in
  *[!A-Za-z0-9_.-]*|'')
    echo 'Invalid release tag' >&2
    exit 1
    ;;
esac

if command -v podman >/dev/null 2>&1; then
  CONTAINER_ENGINE="${CONTAINER_ENGINE:-podman}"
elif command -v docker >/dev/null 2>&1; then
  CONTAINER_ENGINE="${CONTAINER_ENGINE:-docker}"
else
  echo 'podman or docker required' >&2
  exit 1
fi

for tool in jq syft trivy cosign; do
  command -v "$tool" >/dev/null 2>&1 || {
    echo "$tool unavailable" >&2
    exit 1
  }
done

[ -f "$BUILD_CONTEXT/Dockerfile" ] && [ -f "$BUILD_CONTEXT/pnpm-lock.yaml" ] || {
  echo 'Dockerfile and deterministic pnpm-lock.yaml required before OCI release' >&2
  exit 1
}

mkdir -p "$OUTPUT_DIR"
image="${OCI_REGISTRY_REPOSITORY}:${RELEASE_TAG}"
digest_file="$OUTPUT_DIR/image-digest.txt"

# Step 1: Build local candidate image without pushing untrusted artifacts
"$CONTAINER_ENGINE" build --platform linux/amd64 -t "$image" -f "$BUILD_CONTEXT/Dockerfile" "$BUILD_CONTEXT"

# Step 2: Gate on HIGH/CRITICAL CVEs BEFORE pushing to registry
trivy image --exit-code 1 --severity HIGH,CRITICAL "$image"

# Step 3: Push verified image and capture immutable sha256 digest
if [ "$CONTAINER_ENGINE" = "podman" ]; then
  podman push --digestfile "$digest_file" "$image"
  digest="$(tr -d '[:space:]' < "$digest_file")"
else
  docker push "$image"
  digest="$(docker image inspect --format '{{index .RepoDigests 0}}' "$image" | awk -F@ '{print $2}')"
fi

echo "$digest" | grep -Eq '^sha256:[0-9a-f]{64}$' || {
  echo "Invalid build digest: $digest" >&2
  exit 1
}

ref="${OCI_REGISTRY_REPOSITORY}@${digest}"

# Step 4: Export SPDX SBOM, sign immutable digest via OIDC, and attach SBOM attestation
syft "$ref" -o spdx-json > "$OUTPUT_DIR/sbom.spdx.json"
: "${ACTIONS_ID_TOKEN_REQUEST_URL:?CI OIDC token required for keyless Cosign signing}"
cosign sign --yes "$ref"
cosign attest --yes --predicate "$OUTPUT_DIR/sbom.spdx.json" --type spdxjson "$ref"

printf '%s\n' "$ref" > "$OUTPUT_DIR/signed-image-ref.txt"
printf '%s\n' 'OCI image scanned pre-push, pushed by digest, signed and SBOM-attested by CI OIDC.'
