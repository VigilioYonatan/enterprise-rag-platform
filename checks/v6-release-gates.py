#!/usr/bin/env python3
"""Validate v6 release gates and deliverables."""
import json
import sys
from pathlib import Path

root = Path(__file__).resolve().parent.parent
errors = []

# 1. OpenAPI specs
impl_spec = root / "apps/enterprise-rag-impl/openapi.json"
web_spec = root / "apps/enterprise-rag-web/src/generated/openapi.json"

if not impl_spec.is_file():
    errors.append("Missing apps/enterprise-rag-impl/openapi.json")
else:
    data = json.loads(impl_spec.read_text(encoding="utf-8"))
    paths = data.get("paths", {})
    if len(paths) < 43:
        errors.append(f"Expected 43 OpenAPI paths, found {len(paths)}")

if not web_spec.is_file():
    errors.append("Missing apps/enterprise-rag-web/src/generated/openapi.json")
elif impl_spec.is_file():
    if impl_spec.read_text(encoding="utf-8") != web_spec.read_text(encoding="utf-8"):
        errors.append("Drift detected between backend and frontend OpenAPI specs")

# 2. Backend build entrypoints
dist_dir = root / "apps/enterprise-rag-impl/dist"
for entry in ["main.js", "outbox/main.js", "worker/main.js", "database/migrate.js", "platform/setup.js"]:
    if not (dist_dir / entry).is_file():
        errors.append(f"Missing backend entrypoint: dist/{entry}")

# 3. Frontend build
web_dist = root / "apps/enterprise-rag-web/dist/index.html"
if not web_dist.is_file():
    errors.append("Missing frontend build artifact: apps/enterprise-rag-web/dist/index.html")

if errors:
    print("v6 Release gates FAILED:", file=sys.stderr)
    for err in errors:
        print(f" - {err}", file=sys.stderr)
    sys.exit(1)

print("v6 Release gates: PASS (43 OpenAPI paths, zero drift, 5 backend entrypoints, Vite web dist)")
