#!/usr/bin/env python3
"""Source-level wiring and contract checks for ATLAS Enterprise RAG Platform."""
import json
import sys
from pathlib import Path

if sys.stdout.encoding != "utf-8":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except AttributeError:
        pass

r = Path(__file__).resolve().parents[1]
b = r / 'apps/enterprise-rag-impl'
w = r / 'apps/enterprise-rag-web'
d = r / 'enterprise-rag-deploy'
errors: list[str] = []


def require(cond: bool, message: str) -> None:
    if not cond:
        errors.append(message)


# 1. Base Project Structure
for path in [
    'README.md',
    'CHANGELOG.md',
    'VERSION',
    'apps/enterprise-rag-impl/package.json',
    'apps/enterprise-rag-web/package.json',
    'apps/enterprise-rag-impl/packages/contracts/package.json',
    'platform-ops/README.md',
    'prod-local/README.md',
]:
    require((r / path).is_file(), f'Missing {path}')

# 2. Backend Modules in AppModule
app_mod = (b / 'src/app.module.ts').read_text(encoding='utf-8')
for module in (
    'Knowledge',
    'Conversations',
    'Evaluations',
    'Governance',
    'Uploads',
):
    require(module + 'Module' in app_mod, f'AppModule missing {module}Module')

# 3. Entrypoints
for f in ['main.ts', 'worker/main.ts', 'outbox/main.ts']:
    require((b / 'src' / f).exists(), f'Missing backend entrypoint {f}')

# 4. Migrations
for m in [
    '001_core.sql',
    '002_enterprise_capabilities.sql',
    '003_operations.sql',
    '004_groups_and_vector.sql',
    '005_conversation_revocation.sql',
    '006_answer_evidence.sql',
    '007_worker_leases.sql',
    '008_member_directory_rls.sql',
    '009_storage_deletion.sql',
    '010_finops_costs.sql',
    '011_evaluation_quality.sql',
    '012_v6_senior_hardening.sql',
]:
    require((b / 'src/database/migrations' / m).is_file(), f'Missing migration {m}')

# 5. Frontend Pages in app.tsx
app_tsx = (w / 'src/app/app.tsx').read_text(encoding='utf-8')
for page in (
    'knowledge',
    'assistant',
    'conversations',
    'evaluations',
    'operations',
    'security',
):
    require(f'path="{page}"' in app_tsx or f"path='{page}'" in app_tsx, f'Frontend router missing path {page}')

# 6. Contracts Package Build
require((b / 'packages/contracts/dist/src/contracts.d.ts').is_file(), 'Missing built contracts.d.ts')
require((b / 'packages/contracts/dist/src/contracts.js').is_file(), 'Missing built contracts.js')

if errors:
    print(f'❌ Contract and wiring checks failed ({len(errors)} error(s)):')
    for err in errors:
        print(f'  - {err}')
    sys.exit(1)

print('✅ Contract and system wiring checks passed with 100% integrity!')
sys.exit(0)
