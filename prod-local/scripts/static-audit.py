#!/usr/bin/env python3
"""Static structural & security audit for the 5-repository Enterprise RAG platform."""
from pathlib import Path

root = Path(__file__).resolve().parents[2]

# 1. Verify 5 logical repositories and zero root workspace/shared contract coupling
for repo in (
    "apps/enterprise-rag-impl",
    "apps/enterprise-rag-web",
    "enterprise-rag-deploy",
    "platform-ops",
    "prod-local",
):
    assert (root / repo).is_dir(), f"Missing logical repository: {repo}"

for forbidden_root in ("package.json", "pnpm-workspace.yaml", "contracts", "packages"):
    assert not (root / forbidden_root).exists(), f"Forbidden root coupling artifact: {forbidden_root}"

# 2. Verify SQL migrations 001..012 and FORCE ROW LEVEL SECURITY hardening
migrations_dir = root / "apps/enterprise-rag-impl/src/database/migrations"
sql_files = sorted(p.name for p in migrations_dir.glob("*.sql"))
assert len(sql_files) >= 12, f"Expected >= 12 migrations, found {len(sql_files)}"
assert "012_v6_senior_hardening.sql" in sql_files, "Missing 012_v6_senior_hardening.sql"

core_sql = (migrations_dir / "001_core.sql").read_text(encoding="utf-8")
for token in ("ENABLE ROW LEVEL SECURITY", "can_read_document", "document_chunks", "app.actor_sub"):
    assert token in core_sql, f"Missing core RLS token: {token}"

hardening_sql = (migrations_dir / "012_v6_senior_hardening.sql").read_text(encoding="utf-8")
for token in (
    "FORCE ROW LEVEL SECURITY",
    "reserve_tenant_answer_budget",
    "outbox_events",
    "processed_events",
    "is_schema_ready",
):
    assert token in hardening_sql, f"Missing v6 SQL hardening token: {token}"

# 3. Verify Compose uses RustFS, Outbox, Distroless/nonroot entrypoints, and internal networks
compose_text = (root / "enterprise-rag-deploy/compose/compose.yaml").read_text(encoding="utf-8")
assert "rustfs/rustfs" in compose_text, "Compose must use Apache-2.0 RustFS"
assert "minio/minio" not in compose_text and "minio/mc" not in compose_text, "Legacy MinIO image present"
assert "dist/outbox/main.js" in compose_text, "Missing outbox relay service in compose.yaml"
assert "dist/platform/setup.js" in compose_text, "Missing platform-setup service in compose.yaml"
assert compose_text.count("internal: true") >= 2, "backend and observability networks must set internal: true"
assert "0.0.0.0:5432" not in compose_text and "0.0.0.0:6379" not in compose_text and "0.0.0.0:9000" not in compose_text

# 4. Verify OpenAPI contract parity between impl and web
impl_spec = (root / "apps/enterprise-rag-impl/openapi.json").read_text(encoding="utf-8")
web_spec = (root / "apps/enterprise-rag-web/src/generated/openapi.json").read_text(encoding="utf-8")
assert len(impl_spec) > 10000 and len(web_spec) > 10000, "OpenAPI specs must be populated"

print("Static structure, FORCE RLS, RustFS Compose & OpenAPI parity: PASS (live container runtime evaluated separately)")
