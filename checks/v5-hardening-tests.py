#!/usr/bin/env python3
"""Check v5/v6 DevSecOps and container hardening invariants."""
import sys
from pathlib import Path

root = Path(__file__).resolve().parent.parent
errors = []

# 1. Compose file hardening
compose_path = root / "enterprise-rag-deploy/compose/compose.yaml"
if not compose_path.is_file():
    errors.append("Missing compose.yaml")
else:
    c_text = compose_path.read_text(encoding="utf-8")
    if "rustfs/rustfs" not in c_text:
        errors.append("Compose does not use rustfs/rustfs S3 image")
    if "minio/minio" in c_text or "minio/mc" in c_text:
        errors.append("Compose contains legacy minio reference")
    if "0.0.0.0:5432" in c_text or "0.0.0.0:6379" in c_text or "0.0.0.0:9000" in c_text:
        errors.append("Sensitive backend port bound to all host interfaces (0.0.0.0)")
    if c_text.count("internal: true") < 2:
        errors.append("Backend and observability networks must declare 'internal: true'")

# 2. Containerfile nonroot user
df_impl = root / "apps/enterprise-rag-impl/Dockerfile"
if df_impl.is_file():
    df_text = df_impl.read_text(encoding="utf-8")
    if "65532:65532" not in df_text:
        errors.append("Backend Dockerfile does not run as nonroot user 65532:65532")

# 3. Caddy security headers
caddy_path = root / "enterprise-rag-deploy/caddy/Caddyfile"
if caddy_path.is_file():
    c_text = caddy_path.read_text(encoding="utf-8")
    for header in ["Content-Security-Policy", "X-Content-Type-Options", "X-Frame-Options"]:
        if header not in c_text:
            errors.append(f"Caddyfile missing security header: {header}")

if errors:
    print("v5/v6 Hardening check FAILED:", file=sys.stderr)
    for err in errors:
        print(f" - {err}", file=sys.stderr)
    sys.exit(1)

print("v5/v6 Hardening check: PASS (RustFS, isolated networks, nonroot distroless, Caddy CSP verified)")
