#!/usr/bin/env python3
"""Verify that all media and file assets referenced in README.md exist on disk and have valid sizes,
and that all remote HTTP/HTTPS images, badges, and documentation links return HTTP 200 via curl (Zero Broken Links)."""
from __future__ import annotations
import os
import re
import subprocess
import sys
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parent.parent
README = ROOT / "README.md"


def is_local_dev_url(url: str) -> bool:
    parsed = urlparse(url)
    hostname = (parsed.hostname or "").lower()
    return hostname in ("localhost", "127.0.0.1", "0.0.0.0", "app.example.com", "auth.example.com")


def verify_remote_url(url: str) -> tuple[bool, str]:
    """Test remote URL using curl (HEAD then GET fallback)."""
    # HEAD request first
    cmd_head = [
        "curl.exe" if os.name == "nt" else "curl",
        "-I", "-s", "-f", "-L",
        "-A", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "--connect-timeout", "8",
        "--max-time", "15",
        url
    ]
    res = subprocess.run(cmd_head, capture_output=True)
    if res.returncode == 0:
        return True, "200 OK (HEAD)"

    # Fallback to byte-range GET if server blocks HEAD (e.g., some CDNs)
    cmd_get = [
        "curl.exe" if os.name == "nt" else "curl",
        "-s", "-f", "-L",
        "-A", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "--range", "0-1024",
        "--connect-timeout", "8",
        "--max-time", "15",
        url
    ]
    res_get = subprocess.run(cmd_get, capture_output=True)
    if res_get.returncode == 0:
        return True, "200 OK (GET)"

    return False, f"curl failed (HEAD code={res.returncode}, GET code={res_get.returncode})"


def main() -> int:
    if not README.exists():
        print(f"ERROR: {README} does not exist", file=sys.stderr)
        return 1

    content = README.read_text(encoding="utf-8")
    
    # 1. Extract all asset, image, and link targets
    patterns = [
        r'src=["\']([^"\']+)["\']',
        r'srcset=["\']([^"\']+)["\']',
        r'href=["\']([^"\']+)["\']',
        r'!\[.*?\]\(([^)]+)\)',
        r'\[.*?\]\(([^)]+)\)',
    ]

    local_references: set[str] = set()
    remote_urls: set[str] = set()

    for pat in patterns:
        for match in re.findall(pat, content):
            clean = match.strip().strip("`").strip()
            if not clean or clean.startswith("#"):
                continue
            if clean.startswith("http://") or clean.startswith("https://"):
                if not is_local_dev_url(clean):
                    remote_urls.add(clean)
            elif clean.startswith("mailto:"):
                continue
            else:
                clean_path = clean.split("?")[0].strip()
                if clean_path:
                    local_references.add(clean_path)

    # 2. Verify local assets & files
    print(f"=== 1. Verifying {len(local_references)} local assets and files in README.md ===")
    missing_local = []
    for ref in sorted(local_references):
        target = (ROOT / ref).resolve()
        if not target.exists():
            print(f"  ❌ MISSING LOCAL: {ref} -> {target}")
            missing_local.append(ref)
        else:
            size = target.stat().st_size
            if size == 0:
                print(f"  ❌ EMPTY FILE (0 bytes): {ref}")
                missing_local.append(ref)
            else:
                print(f"  ✓ OK: {ref} ({size:,} bytes)")

    # 3. Verify remote URLs and badges with curl
    print(f"\n=== 2. Verifying {len(remote_urls)} remote URLs & badges via curl (Zero Broken Links) ===")
    broken_remote = []
    for url in sorted(remote_urls):
        ok, msg = verify_remote_url(url)
        if ok:
            print(f"  ✓ {msg}: {url}")
        else:
            print(f"  ❌ BROKEN REMOTE ({msg}): {url}")
            broken_remote.append((url, msg))

    # Summary
    if missing_local or broken_remote:
        print(f"\n❌ AUDIT FAILED: {len(missing_local)} missing local file(s), {len(broken_remote)} broken remote URL(s)!", file=sys.stderr)
        return 1

    print("\n✅ SENIOR MODE PASS: All README.md local assets (bytes > 0) and remote URLs/images (curl HTTP 200) verified successfully!")
    return 0


if __name__ == "__main__":
    if sys.stdout.encoding != "utf-8":
        try:
            sys.stdout.reconfigure(encoding="utf-8")
            sys.stderr.reconfigure(encoding="utf-8")
        except AttributeError:
            pass
    sys.exit(main())
