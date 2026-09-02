#!/usr/bin/env python3
"""Source structural audit across the entire enterprise-rag-platform workspace."""
import hashlib
import json
import os
import sys
from pathlib import Path

root = Path(__file__).resolve().parent.parent
errors = []

# 1. Verify 5 repositories
repos = [
    "apps/enterprise-rag-impl",
    "apps/enterprise-rag-web",
    "enterprise-rag-deploy",
    "platform-ops",
    "prod-local",
]
for repo in repos:
    if not (root / repo).is_dir():
        errors.append(f"Missing logical repository directory: {repo}")

# 2. Check for unexpected / forbidden files
for f in ["package.json", "pnpm-workspace.yaml", "contracts", "packages"]:
    if (root / f).exists():
        errors.append(f"Root contains forbidden artifact: {f}")

# 3. Audit UTF-8 encoding and inspect all source files
source_extensions = {".ts", ".tsx", ".js", ".mjs", ".cjs", ".py", ".sh", ".sql", ".css", ".html", ".yaml", ".yml", ".json", ".md", ".feature"}
checked_count = 0
for p in root.rglob("*"):
    if not p.is_file():
        continue
    # Skip ignored dirs
    if any(part in p.parts for part in ["node_modules", ".git", "dist", ".vite", "coverage", "test-results", "playwright-report"]):
        continue
    if p.suffix in source_extensions:
        checked_count += 1
        try:
            content = p.read_text(encoding="utf-8")
            if "\x00" in content:
                errors.append(f"NUL byte found in text file: {p.relative_to(root)}")
        except UnicodeDecodeError:
            errors.append(f"Non-UTF8 encoding in file: {p.relative_to(root)}")

result = {
    "status": "PASS" if not errors else "FAIL",
    "source_files_checked": checked_count,
    "error_count": len(errors),
    "errors": errors,
}

(root / "checks/source-audit-results.json").write_text(json.dumps(result, indent=2), encoding="utf-8")

if errors:
    print(f"Source audit FAILED with {len(errors)} issues:", file=sys.stderr)
    for err in errors:
        print(f" - {err}", file=sys.stderr)
    sys.exit(1)

print(f"Source audit: PASS ({checked_count} text source files verified, 0 encoding/boundary errors)")
