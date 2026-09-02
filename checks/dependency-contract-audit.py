#!/usr/bin/env python3
"""Audit declared dependencies across package manifests for compliance."""
import json
import sys
from pathlib import Path

root = Path(__file__).resolve().parent.parent
errors = []

for repo_path in ["apps/enterprise-rag-impl", "apps/enterprise-rag-web"]:
    pkg_file = root / repo_path / "package.json"
    if not pkg_file.is_file():
        errors.append(f"Missing package.json in {repo_path}")
        continue
    try:
        data = json.loads(pkg_file.read_text(encoding="utf-8"))
    except Exception as e:
        errors.append(f"Invalid JSON in {pkg_file}: {e}")
        continue

    deps = data.get("dependencies", {})
    dev_deps = data.get("devDependencies", {})
    all_deps = {**deps, **dev_deps}

    for forbidden in ["aws-sdk", "@aws-sdk", "minio"]:
        for d in all_deps:
            if forbidden in d:
                errors.append(f"Forbidden dependency '{d}' declared in {repo_path}/package.json")

    # Check for engines
    engines = data.get("engines", {})
    if "node" not in engines:
        errors.append(f"Missing node engine specification in {repo_path}/package.json")

if errors:
    print("Dependency audit FAILED:", file=sys.stderr)
    for err in errors:
        print(f" - {err}", file=sys.stderr)
    sys.exit(1)

print("Dependency & contract audit: PASS (all manifests valid, zero AWS/MinIO dependencies)")
