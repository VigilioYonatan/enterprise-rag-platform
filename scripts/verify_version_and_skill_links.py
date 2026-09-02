#!/usr/bin/env python3
"""Verify SSOT version consistency across packages, OpenAPI, Changelog, and skills links."""
from __future__ import annotations
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def main() -> int:
    if sys.stdout.encoding != "utf-8":
        try:
            sys.stdout.reconfigure(encoding="utf-8")
            sys.stderr.reconfigure(encoding="utf-8")
        except AttributeError:
            pass

    errors: list[str] = []

    # 1. Read SSOT Version
    version_file = ROOT / "VERSION"
    if not version_file.exists():
        errors.append("VERSION file missing in repository root")
        return 1

    expected_version = version_file.read_text(encoding="utf-8").strip()
    print(f"Canonical SSOT Version: {expected_version}")

    # 2. Check CHANGELOG.md
    changelog = ROOT / "CHANGELOG.md"
    if not changelog.exists() or f"## [{expected_version}]" not in changelog.read_text(encoding="utf-8"):
        errors.append(f"CHANGELOG.md missing header for [{expected_version}]")
    else:
        print(f"  ✓ CHANGELOG.md matches {expected_version}")

    # 3. Check packages
    package_targets = [
        ROOT / "apps/enterprise-rag-impl/package.json",
        ROOT / "apps/enterprise-rag-web/package.json",
        ROOT / "apps/enterprise-rag-impl/packages/contracts/package.json",
    ]
    for pkg in package_targets:
        if not pkg.exists():
            errors.append(f"Package missing: {pkg}")
            continue
        data = json.loads(pkg.read_text(encoding="utf-8"))
        actual_ver = data.get("version")
        if actual_ver != expected_version:
            errors.append(f"{pkg.relative_to(ROOT)} has version '{actual_ver}', expected '{expected_version}'")
        else:
            print(f"  ✓ {pkg.relative_to(ROOT)} version matches {expected_version}")

    # 4. Check OpenAPI Specification
    openapi_file = ROOT / "apps/enterprise-rag-impl/openapi.json"
    if not openapi_file.exists():
        errors.append("apps/enterprise-rag-impl/openapi.json missing")
    else:
        spec = json.loads(openapi_file.read_text(encoding="utf-8"))
        api_ver = spec.get("info", {}).get("version")
        if api_ver != expected_version:
            errors.append(f"openapi.json info.version is '{api_ver}', expected '{expected_version}'")
        else:
            print(f"  ✓ openapi.json info.version matches {expected_version}")

    # 5. Check main.ts setVersion
    main_ts = ROOT / "apps/enterprise-rag-impl/src/main.ts"
    if main_ts.exists():
        content = main_ts.read_text(encoding="utf-8")
        if f".setVersion('{expected_version}')" not in content:
            errors.append(f"apps/enterprise-rag-impl/src/main.ts missing .setVersion('{expected_version}')")
        else:
            print(f"  ✓ main.ts .setVersion matches {expected_version}")

    # 6. Check GitHub Release Guide
    release_guide = ROOT / f"docs/GITHUB_RELEASE_{expected_version}.md"
    if not release_guide.exists():
        errors.append(f"Release documentation missing: {release_guide.relative_to(ROOT)}")
    else:
        print(f"  ✓ {release_guide.relative_to(ROOT)} exists and verified")

    # 7. Check Skills & Vigilio Docs
    required_skills = [
        ROOT / "skills/readme-visual-showcase-and-versioning/SKILL.md",
        ROOT / "skills/.vigilio-docs/adr",
        ROOT / "skills/.vigilio-docs/standards",
    ]
    for skill_path in required_skills:
        if not skill_path.exists():
            errors.append(f"Required skill asset missing: {skill_path.relative_to(ROOT)}")
        else:
            print(f"  ✓ Skill asset verified: {skill_path.relative_to(ROOT)}")

    if errors:
        print("\n❌ Version and Skill verification failed:")
        for err in errors:
            print(f"  - {err}")
        return 1

    print("\n✅ SSOT Version consistency and Skill links 100% verified!")
    return 0


if __name__ == "__main__":
    sys.exit(main())
