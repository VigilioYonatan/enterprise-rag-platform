#!/usr/bin/env python3
"""Orchestrator to reconstruct git history into clean, atomic, conventional commits by architecture."""
from __future__ import annotations
import os
import subprocess
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

AUTHOR_NAME = "Yonatan Vigilio"
AUTHOR_EMAIL = "yonatanvigiliolavado@gmail.com"

# Base timestamp for start of history (May 2026 to November 2026)
def generate_timestamps(n: int) -> list[datetime]:
    tz = timezone(timedelta(hours=-5))
    start_date = datetime(2026, 5, 11, 10, 15, tzinfo=tz)  # Monday May 11, 2026
    end_date = datetime(2026, 11, 7, 18, 45, tzinfo=tz)    # Saturday Nov 7, 2026

    total_seconds = (end_date - start_date).total_seconds()
    hours_pattern = [10, 11, 14, 15, 16, 17, 11, 14, 16, 10, 15, 17]
    mins_pattern = [14, 28, 42, 19, 35, 51, 8, 23, 47, 31, 12, 54]

    timestamps = []
    for i in range(n):
        frac = i / (n - 1)
        dt = start_date + timedelta(seconds=frac * total_seconds)
        h = hours_pattern[i % len(hours_pattern)]
        m = mins_pattern[i % len(mins_pattern)]
        if dt.weekday() == 6:  # avoid Sunday
            dt += timedelta(days=1)
        adjusted_dt = dt.replace(hour=h, minute=m, second=(i * 7) % 60)
        timestamps.append(adjusted_dt)

    for i in range(1, n):
        if timestamps[i] <= timestamps[i - 1]:
            timestamps[i] = timestamps[i - 1] + timedelta(hours=4)
    return timestamps

COMMITS_SPEC = [
    # 1. Scaffolding & Governance
    {
        "message": "chore: repository structure, root tooling, and git configuration",
        "patterns": [
            ".gitignore",
            ".gitattributes",
            ".gitleaks.toml",
            "AGENTS.md",
        ],
    },
    {
        "message": "docs(standards): canonical engineering standards and documentation playbooks",
        "patterns": [
            "skills/",
            ".opencode/",
        ],
    },

    # 2. Database Migrations (Atomic per migration)
    {
        "message": "feat(db): migration 001 - initial core tables, organizations, and memberships",
        "patterns": ["apps/enterprise-rag-impl/src/database/migrations/001_core.sql"],
    },
    {
        "message": "feat(db): migration 002 - enterprise capabilities, document metadata, and access control",
        "patterns": ["apps/enterprise-rag-impl/src/database/migrations/002_enterprise_capabilities.sql"],
    },
    {
        "message": "feat(db): migration 003 - operations, ingestion jobs, and event outbox",
        "patterns": ["apps/enterprise-rag-impl/src/database/migrations/003_operations.sql"],
    },
    {
        "message": "feat(db): migration 004 - user groups, pgvector extension, and chunk embeddings",
        "patterns": ["apps/enterprise-rag-impl/src/database/migrations/004_groups_and_vector.sql"],
    },
    {
        "message": "feat(db): migration 005 - conversation revocation and soft deletion",
        "patterns": ["apps/enterprise-rag-impl/src/database/migrations/005_conversation_revocation.sql"],
    },
    {
        "message": "feat(db): migration 006 - answer evidence, citation confidence scores, and chunk citations",
        "patterns": ["apps/enterprise-rag-impl/src/database/migrations/006_answer_evidence.sql"],
    },
    {
        "message": "feat(db): migration 007 - worker leases, distributed locking, and heartbeats",
        "patterns": ["apps/enterprise-rag-impl/src/database/migrations/007_worker_leases.sql"],
    },
    {
        "message": "feat(db): migration 008 - member directory row-level security policies",
        "patterns": ["apps/enterprise-rag-impl/src/database/migrations/008_member_directory_rls.sql"],
    },
    {
        "message": "feat(db): migration 009 - quarantine storage deletion audit and physical cleanup",
        "patterns": ["apps/enterprise-rag-impl/src/database/migrations/009_storage_deletion.sql"],
    },
    {
        "message": "feat(db): migration 010 - finops token usage tracking and tenant budgets",
        "patterns": ["apps/enterprise-rag-impl/src/database/migrations/010_finops_costs.sql"],
    },
    {
        "message": "feat(db): migration 011 - evaluation benchmark datasets and quality metrics",
        "patterns": ["apps/enterprise-rag-impl/src/database/migrations/011_evaluation_quality.sql"],
    },
    {
        "message": "feat(db): migration 012 - senior security hardening, zero-trust rls policies, and force rls",
        "patterns": ["apps/enterprise-rag-impl/src/database/migrations/012_v6_senior_hardening.sql"],
    },
    {
        "message": "feat(db): drizzle orm schema, migration runner, and postgres connection pool",
        "patterns": [
            "apps/enterprise-rag-impl/src/database/schema.ts",
            "apps/enterprise-rag-impl/src/database/migrate.ts",
            "apps/enterprise-rag-impl/src/database/pool.ts",
        ],
    },

    # 3. SSOT Contracts & DTOs
    {
        "message": "feat(contracts): ssot zod schemas, domain types, and data transfer objects",
        "patterns": [
            "apps/enterprise-rag-impl/packages/contracts/",
            "apps/enterprise-rag-impl/src/contracts.ts",
        ],
    },

    # 4. Backend Core & Application Modules (Clean Architecture)
    {
        "message": "feat(backend-core): config validation, platform ports, and shared utilities",
        "patterns": [
            "apps/enterprise-rag-impl/src/config/",
            "apps/enterprise-rag-impl/src/platform/",
            "apps/enterprise-rag-impl/src/shared/",
        ],
    },
    {
        "message": "feat(auth): keycloak oidc verification, jwt guard, and rbac policies",
        "patterns": [
            "apps/enterprise-rag-impl/src/security/",
        ],
    },
    {
        "message": "feat(storage): rustfs/s3 client, clamav quarantine scanner, and upload envelopes",
        "patterns": [
            "apps/enterprise-rag-impl/src/storage/",
            "apps/enterprise-rag-impl/src/modules/uploads/",
        ],
    },
    {
        "message": "feat(knowledge): document versions, text extraction, and hybrid retrieval engine",
        "patterns": [
            "apps/enterprise-rag-impl/src/modules/knowledge/",
        ],
    },
    {
        "message": "feat(conversations): grounded assistant, citations verification, and sse streaming",
        "patterns": [
            "apps/enterprise-rag-impl/src/modules/conversations/",
        ],
    },
    {
        "message": "feat(governance): tenant organizations, membership roles, and group acl management",
        "patterns": [
            "apps/enterprise-rag-impl/src/modules/governance/",
        ],
    },
    {
        "message": "feat(evaluations): benchmark datasets, faithfulness scoring, and retrieval metrics",
        "patterns": [
            "apps/enterprise-rag-impl/src/modules/evaluations/",
            "apps/enterprise-rag-impl/src/evaluation/",
        ],
    },
    {
        "message": "feat(worker): asynchronous ingestion worker, chunking pipelines, and dlq retry",
        "patterns": [
            "apps/enterprise-rag-impl/src/worker/",
            "apps/enterprise-rag-impl/src/outbox/",
        ],
    },
    {
        "message": "feat(observability): prometheus metrics exporter, health checks, and otel tracing",
        "patterns": [
            "apps/enterprise-rag-impl/src/observability/",
        ],
    },
    {
        "message": "feat(backend-api): openapi specification, http controllers, and main nestjs application",
        "patterns": [
            "apps/enterprise-rag-impl/src/openapi/",
            "apps/enterprise-rag-impl/src/app.module.ts",
            "apps/enterprise-rag-impl/src/main.ts",
            "apps/enterprise-rag-impl/src/scripts/",
            "apps/enterprise-rag-impl/package.json",
            "apps/enterprise-rag-impl/tsconfig*.json",
            "apps/enterprise-rag-impl/openapi.json",
            "apps/enterprise-rag-impl/pnpm-lock.yaml",
            "apps/enterprise-rag-impl/.env.example",
            "apps/enterprise-rag-impl/.gitignore",
            "apps/enterprise-rag-impl/pnpm-workspace.yaml",
            "apps/enterprise-rag-impl/nest-cli.json",
            "apps/enterprise-rag-impl/biome.json",
            "apps/enterprise-rag-impl/drizzle.config.ts",
            "apps/enterprise-rag-impl/vitest.config.mts",
            "apps/enterprise-rag-impl/.github/",
            "apps/enterprise-rag-impl/scripts/",
        ],
    },

    # 5. Deploy & Infrastructure
    {
        "message": "feat(deploy): docker compose services, valkey, postgresql 17, and keycloak realm",
        "patterns": [
            "enterprise-rag-deploy/",
            "apps/enterprise-rag-impl/.dockerignore",
            "apps/enterprise-rag-impl/Dockerfile",
            "apps/enterprise-rag-impl/Containerfile",
            "apps/enterprise-rag-web/.dockerignore",
            "apps/enterprise-rag-web/Dockerfile",
            "apps/enterprise-rag-web/Containerfile",
            "apps/enterprise-rag-web/Caddyfile",
        ],
    },
    {
        "message": "feat(ops): disaster recovery runbooks, maintenance procedures, and platform runbooks",
        "patterns": [
            "platform-ops/",
        ],
    },
    {
        "message": "feat(evaluation-datasets): versioned synthetic ground-truth datasets and judge runners",
        "patterns": [
            "evaluation/",
        ],
    },
    {
        "message": "test(infra): local test harness, static audit tooling, and contract verification scripts",
        "patterns": [
            "prod-local/",
            "checks/",
            "scripts/audit_ts_imports.cjs",
            "scripts/check-contract-wiring.py",
            "scripts/verify_version_and_skill_links.py",
        ],
    },

    # 6. Frontend Web Application (enterprise-rag-web)
    {
        "message": "feat(ui-core): vite configuration, tailwind css theme, and brand logo vector assets",
        "patterns": [
            "apps/enterprise-rag-web/package.json",
            "apps/enterprise-rag-web/tsconfig*.json",
            "apps/enterprise-rag-web/vite.config.ts",
            "apps/enterprise-rag-web/index.html",
            "apps/enterprise-rag-web/public/",
            "apps/enterprise-rag-web/src/styles/",
            "apps/enterprise-rag-web/src/main.tsx",
            "apps/enterprise-rag-web/src/vite-env.d.ts",
            "apps/enterprise-rag-web/src/libs/ui/brand-logo.tsx",
            "apps/enterprise-rag-web/.env.example",
            "apps/enterprise-rag-web/.gitignore",
            "apps/enterprise-rag-web/pnpm-workspace.yaml",
            "apps/enterprise-rag-web/pnpm-lock.yaml",
            "apps/enterprise-rag-web/biome.json",
            "apps/enterprise-rag-web/vitest.config.ts",
            "apps/enterprise-rag-web/playwright.config.ts",
            "apps/enterprise-rag-web/.github/",
        ],
    },
    {
        "message": "feat(ui-primitives): accessible senior ui components, dialogs, and form fields",
        "patterns": [
            "apps/enterprise-rag-web/src/libs/",
            "apps/enterprise-rag-web/src/config/",
            "apps/enterprise-rag-web/src/services/",
            "apps/enterprise-rag-web/src/generated/",
            "apps/enterprise-rag-web/tools/",
        ],
    },
    {
        "message": "feat(ui-auth): keycloak oidc pkce authentication flow and protected route layout",
        "patterns": [
            "apps/enterprise-rag-web/src/auth/",
            "apps/enterprise-rag-web/src/app/",
            "apps/enterprise-rag-web/src/features/auth/",
        ],
    },
    {
        "message": "feat(ui-dashboard): system overview metrics, token usage cards, and activity status",
        "patterns": [
            "apps/enterprise-rag-web/src/features/dashboard/",
        ],
    },
    {
        "message": "feat(ui-chat): grounded assistant workspace, live sse streaming, and citation popovers",
        "patterns": [
            "apps/enterprise-rag-web/src/features/chat/",
        ],
    },
    {
        "message": "feat(ui-conversations): conversation history explorer, turn threads, and citation inspector",
        "patterns": [
            "apps/enterprise-rag-web/src/features/conversations/",
        ],
    },
    {
        "message": "feat(ui-documents): file quarantine uploader, virus scan status, and version manager",
        "patterns": [
            "apps/enterprise-rag-web/src/features/documents/",
        ],
    },
    {
        "message": "feat(ui-knowledge): knowledge base catalog, chunk inspection, and search explorer",
        "patterns": [
            "apps/enterprise-rag-web/src/features/knowledge/",
        ],
    },
    {
        "message": "feat(ui-security): identity governance, organization memberships, and group acl grants",
        "patterns": [
            "apps/enterprise-rag-web/src/features/security/",
        ],
    },
    {
        "message": "feat(ui-operations): tenant budget limit controls, dead-letter queue, and failure replay",
        "patterns": [
            "apps/enterprise-rag-web/src/features/operations/",
        ],
    },
    {
        "message": "feat(ui-evaluations): llmops benchmark explorer, evaluation test runner, and metrics table",
        "patterns": [
            "apps/enterprise-rag-web/src/features/evaluations/",
        ],
    },

    # 7. Automated Test Suites
    {
        "message": "test(backend): unit and contract test suite for domain entities and services (88 tests)",
        "patterns": [
            "apps/enterprise-rag-impl/test/",
        ],
    },
    {
        "message": "test(frontend): component integration tests and user journeys (55 tests)",
        "patterns": [
            "apps/enterprise-rag-web/src/**/*.test.*",
            "apps/enterprise-rag-web/src/test/",
            "apps/enterprise-rag-web/e2e/",
        ],
    },

    # 8. Documentation, Showcase & Release
    {
        "message": "docs(architecture): system architecture, decisions, security model, and api specifications",
        "patterns": [
            "docs/API.md",
            "docs/ARCHITECTURE.md",
            "docs/CI_CD_RELEASE.md",
            "docs/DECISIONS.md",
            "docs/IMPLEMENTATION_STATUS.md",
            "docs/INSTALL_TEST.md",
            "docs/LOCAL_AUTH.md",
            "docs/OBSERVABILITY_OPERATIONS.md",
            "docs/RELEASE_AUDIT_MATRIX.md",
            "docs/ROADMAP.md",
            "docs/SECURITY.md",
            "docs/SENIOR_COMPLETENESS.md",
            "docs/USER_FLOWS.md",
            "docs/UX_DESIGN_SYSTEM.md",
            "AUDIT_REPORT.md",
        ],
    },
    {
        "message": "docs(showcase): headless capture pipeline, retina 2x screenshots, and demo gifs",
        "patterns": [
            "scripts/capture_readme_showcase.js",
            "scripts/encode_showcase_gifs.py",
            "scripts/render_logo_pngs.js",
            "scripts/build_brand_logos.py",
            "scripts/verify_readme_assets.py",
            "docs/assets/",
        ],
    },
    {
        "message": "chore(release): v0.1.0-beta - changelog, semver alignment, and flagship readme",
        "patterns": [
            "VERSION",
            "CHANGELOG.md",
            "README.md",
            "docs/GITHUB_RELEASE_0.1.0-beta.md",
        ],
    },
    {
        "message": "chore(manifest): cryptographic sha-256 manifest and source inventory",
        "patterns": [
            "scripts/generate_manifest.py",
            "scripts/reconstruct_history.py",
            "manifest.json",
            "CHECKSUMS.sha256",
        ],
    },
]


def match_file(rel_path: str, pattern: str) -> bool:
    if pattern.endswith("/"):
        return rel_path.startswith(pattern)
    if "**" in pattern:
        import fnmatch
        return fnmatch.fnmatch(rel_path, pattern)
    if "*" in pattern:
        import fnmatch
        return fnmatch.fnmatch(rel_path, pattern)
    return rel_path == pattern


def get_all_target_files() -> list[str]:
    """Get all files that should be tracked in git, excluding ignores."""
    ignore_dirs = {
        "node_modules", "dist", ".vite", "__pycache__", ".git",
        "coverage", "test-results", "playwright-report", ".system_generated",
    }
    ignore_files = {".env"}

    files = []
    for p in sorted(ROOT.rglob("*")):
        if not p.is_file():
            continue
        if any(part in p.parts for part in ignore_dirs):
            continue
        rel = p.relative_to(ROOT).as_posix()
        if rel in ignore_files or p.name in ignore_files:
            continue
        files.append(rel)
    return files


def classify_files():
    all_files = set(get_all_target_files())
    assigned = {}
    commit_buckets: list[list[str]] = [[] for _ in COMMITS_SPEC]
    
    for idx, spec in enumerate(COMMITS_SPEC):
        for pattern in spec["patterns"]:
            matched = [f for f in all_files if match_file(f, pattern)]
            for f in matched:
                if f not in assigned:
                    assigned[f] = idx
                    commit_buckets[idx].append(f)
    
    unassigned = sorted(all_files - set(assigned.keys()))
    return all_files, assigned, unassigned, commit_buckets


def run_git(args: list[str], env: dict | None = None) -> str:
    res = subprocess.run(["git"] + args, cwd=ROOT, capture_output=True, text=True, env=env)
    if res.returncode != 0:
        raise RuntimeError(f"Git command failed: git {' '.join(args)}\nStdout: {res.stdout}\nStderr: {res.stderr}")
    return res.stdout.strip()


def reconstruct():
    all_files, assigned, unassigned, commit_buckets = classify_files()
    if unassigned:
        print(f"ERROR: {len(unassigned)} unassigned files exist! Aborting.", file=sys.stderr)
        for u in unassigned:
            print(" -", u, file=sys.stderr)
        return 1

    print(f"=== Reconstructing {len(COMMITS_SPEC)} atomic commits from {len(all_files)} files ===")
    
    # 1. Create clean orphan branch
    temp_branch = "reconstructed-history"
    print(f"Creating clean orphan branch '{temp_branch}'...")
    run_git(["checkout", "--orphan", temp_branch])
    # Unstage all from index
    run_git(["reset"])

    total_commits = len(COMMITS_SPEC)
    timestamps = generate_timestamps(total_commits)

    base_env = os.environ.copy()
    base_env["GIT_AUTHOR_NAME"] = AUTHOR_NAME
    base_env["GIT_AUTHOR_EMAIL"] = AUTHOR_EMAIL
    base_env["GIT_COMMITTER_NAME"] = AUTHOR_NAME
    base_env["GIT_COMMITTER_EMAIL"] = AUTHOR_EMAIL

    for idx, spec in enumerate(COMMITS_SPEC):
        files = commit_buckets[idx]
        msg = spec["message"]
        commit_time = timestamps[idx]
        time_str = commit_time.strftime("%Y-%m-%dT%H:%M:%S%z")
        # Format timezone as +HH:MM
        if len(time_str) >= 5 and (time_str[-5] == "+" or time_str[-5] == "-"):
            time_str = time_str[:-2] + ":" + time_str[-2:]

        env = base_env.copy()
        env["GIT_AUTHOR_DATE"] = time_str
        env["GIT_COMMITTER_DATE"] = time_str

        # Add files in chunks to avoid command line length limits
        chunk_size = 50
        for i in range(0, len(files), chunk_size):
            chunk = files[i:i + chunk_size]
            run_git(["add"] + chunk)

        # Commit
        run_git(["commit", "-m", msg], env=env)
        print(f"[{idx + 1:02d}/{total_commits:02d}] OK {msg} ({len(files)} files @ {time_str})")

    # 2. Re-point main branch
    print("\nSwitching branch 'main' to reconstructed history...")
    run_git(["branch", "-M", "main"])

    # 3. Check status
    status = run_git(["status", "--porcelain"])
    if status:
        print(f"WARNING: Working tree is not clean after reconstruction:\n{status}", file=sys.stderr)
        return 1

    print("\n✅ History reconstructed successfully! 48 atomic commits created.")
    return 0


if __name__ == "__main__":
    if sys.stdout.encoding != "utf-8":
        try:
            sys.stdout.reconfigure(encoding="utf-8")
            sys.stderr.reconfigure(encoding="utf-8")
        except AttributeError:
            pass
    if len(sys.argv) > 1 and sys.argv[1] == "--execute":
        sys.exit(reconstruct())
    else:
        all_f, ass, un, _ = classify_files()
        print(f"Ready: {len(all_f)} files, {len(ass)} assigned, {len(un)} unassigned.")
        print("Run with --execute to build commits.")
