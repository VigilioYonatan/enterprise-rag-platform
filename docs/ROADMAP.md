# Roadmap tras el slice inicial

1. Congelar dependencias y lockfiles, unit + integration PG reales, revisión JS/TS, Docker Compose config en CI.
2. Implementar ACL explícita a usuario/grupo y revocación inmediata en documentos y citas; RLS concurrency/pool tests.
3. Upload binario a storage autoalojado + magic-byte detection + antivirus ClamAV + parser PDF/DOCX aislado + outbox/inbox idempotente.
4. Embeddings versionados, benchmarks ANN/FTS y backfill, métricas Recall@K/MRR/nDCG, dataset sintético versionado.
5. Streaming SSE, conversaciones persistentes, citation revalidation, cost budgets/FinOps atómicos.
6. SSO y auth BFF, bloqueo cuentas, MFA obligatorio según política, invitations, rate limits y auditoría trazable.
7. Prometheus/Tempo/Grafana, alertas, PgBackRest WAL PITR y restore aislado, scans supply-chain, firmas OCI, rollback.
8. PR release gates y E2E Playwright con Docker real, perf y accesibilidad manual WCAG 2.2 AA.
