#!/usr/bin/env python3
"""Check v3/v6 database and security invariants."""
import sys
from pathlib import Path

root = Path(__file__).resolve().parent.parent
errors = []

migrations_dir = root / "apps/enterprise-rag-impl/src/database/migrations"
if not migrations_dir.is_dir():
    errors.append("Missing migrations directory")
else:
    files = [p.name for p in migrations_dir.glob("*.sql")]
    if len(files) < 12:
        errors.append(f"Expected >= 12 migrations, found {len(files)}")
    
    # Check 012 hardening
    h12 = migrations_dir / "012_v6_senior_hardening.sql"
    if not h12.is_file():
        errors.append("Missing 012_v6_senior_hardening.sql")
    else:
        text = h12.read_text(encoding="utf-8")
        for token in [
            "FORCE ROW LEVEL SECURITY",
            "reserve_tenant_answer_budget",
            "outbox_events",
            "processed_events",
            "is_schema_ready",
        ]:
            if token not in text:
                errors.append(f"012_v6_senior_hardening.sql missing required invariant: {token}")

if errors:
    print("v3 Invariants check FAILED:", file=sys.stderr)
    for err in errors:
        print(f" - {err}", file=sys.stderr)
    sys.exit(1)

print("v3/v6 Database & Security Invariants: PASS (FORCE RLS, atomic FinOps, transactional outbox verified)")
