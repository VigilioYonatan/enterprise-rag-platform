#!/usr/bin/env python3
"""Generate manifest.json and CHECKSUMS.sha256 with exact SHA-256 integrity."""
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path

root = Path(__file__).resolve().parent.parent

ignore_dirs = {
    "node_modules",
    "dist",
    ".vite",
    "__pycache__",
    ".git",
    "coverage",
    "test-results",
    "playwright-report",
    ".system_generated",
}

ignore_files = {
    "manifest.json",
    "CHECKSUMS.sha256",
    ".env",
}

entries = []
for p in sorted(root.rglob("*")):
    if not p.is_file():
        continue
    if any(part in p.parts for part in ignore_dirs):
        continue
    rel = p.relative_to(root).as_posix()
    if rel in ignore_files or p.name in ignore_files:
        continue

    raw = p.read_bytes()
    sha = hashlib.sha256(raw).hexdigest()
    entries.append({
        "path": rel,
        "bytes": len(raw),
        "sha256": sha,
    })

# 1. Write manifest.json
manifest_data = {
    "version": "6",
    "generated_at_utc": datetime.now(timezone.utc).isoformat(),
    "source_entries_excluding_manifest_and_checksums": len(entries),
    "entries": entries,
}

manifest_file = root / "manifest.json"
manifest_bytes = json.dumps(manifest_data, indent=2).encode("utf-8")
manifest_file.write_bytes(manifest_bytes)
manifest_sha = hashlib.sha256(manifest_bytes).hexdigest()

# 2. Build CHECKSUMS.sha256 list
checksum_rows = [f"{entry['sha256']}  {entry['path']}" for entry in entries]
# Include manifest.json in CHECKSUMS.sha256
checksum_rows.append(f"{manifest_sha}  manifest.json")

# Sort alphabetically by the relative path (second column)
def get_path(row):
    return row.split("  ", 1)[1]

checksum_rows.sort(key=get_path)

checksum_file = root / "CHECKSUMS.sha256"
checksum_file.write_text("\n".join(checksum_rows) + "\n", encoding="utf-8")

print(f"Generated manifest.json with {len(entries)} source entries.")
print(f"Generated CHECKSUMS.sha256 with {len(checksum_rows)} rows (including manifest.json).")
