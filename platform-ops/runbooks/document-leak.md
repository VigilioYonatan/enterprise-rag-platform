# Incident runbook: suspected cross-user retrieval leak (P0)

**Trigger:** unauthorized chunk or citation observed in retrieval, SSE or history.

1. Stop answer generation; remove affected API/worker from routing while preserving logs with restricted access.
2. Revoke exposed access tokens and memberships via the identity provider. Do not dump prompts/chunks into tickets.
3. Identify document ID, tenant, actor and trace/request ID using metadata-only logs.
4. Reproduce with two separate principals against PostgreSQL RLS (API role, not migration/superuser).
5. Fix RLS and citation authorization, ship expand-only migration, then run negative SQL/API/E2E tests.
6. Verify stale citations return 404 after revocation and current conversations do not reveal revoked evidence.
7. Rotate affected secrets; assess disclosure scope and legal notification obligations.
8. Restore traffic only after security review and an approved incident closure.

**Evidence:** incident timeline, precise affected ids (restricted), migration hashes and signed release digests.
