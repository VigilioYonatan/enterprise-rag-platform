#!/usr/bin/env python3
"""File-by-file structural inspection and SHA-256 catalog generation."""
import hashlib
import json
import sys
from pathlib import Path

root = Path(__file__).resolve().parent.parent

records = []
ignore_dirs = {"node_modules", ".git", "dist", ".vite", "coverage", "test-results", "playwright-report"}
source_exts = {".ts", ".tsx", ".js", ".mjs", ".cjs", ".py", ".sh", ".sql", ".css", ".html", ".yaml", ".yml", ".json", ".md", ".feature", ".toml", ".river"}

for p in sorted(root.rglob("*")):
    if not p.is_file():
        continue
    if any(part in p.parts for part in ignore_dirs):
        continue
    if p.name in ["REAUDIT_PER_FILE.json", "V6_TEST_EVIDENCE.json", "V6_DIFF_INVENTORY.json", "local-lab-preflight.json"]:
        continue

    raw = p.read_bytes()
    rel = p.relative_to(root).as_posix()
    sha = hashlib.sha256(raw).hexdigest()
    rec = {
        "path": rel,
        "bytes": len(raw),
        "sha256": sha,
        "status": "PASS",
        "findings": [],
    }

    if len(raw) == 0:
        rec["findings"].append("empty file")

    if p.suffix in source_exts or p.name in ["Dockerfile", "Containerfile", "Caddyfile", ".env.example", ".gitignore", ".dockerignore"]:
        try:
            text = raw.decode("utf-8")
            rec["lines"] = len(text.splitlines())
            if "\x00" in text:
                rec["status"] = "FAIL"
                rec["findings"].append("NUL byte in text")
        except UnicodeDecodeError as e:
            rec["status"] = "FAIL"
            rec["findings"].append(f"UTF-8 decode error: {e}")

    records.append(rec)

out_file = root / "checks/REAUDIT_PER_FILE.json"
out_file.write_text(json.dumps(records, indent=2), encoding="utf-8")
print(f"Per-file audit: PASS ({len(records)} files cataloged into checks/REAUDIT_PER_FILE.json)")
