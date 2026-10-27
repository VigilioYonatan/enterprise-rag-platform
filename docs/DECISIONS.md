# ADR summary

- ADR-001 (proposed): five independent repositories for Compose deployment. ZIP includes logical folders only.
- ADR-002 (approved by user): React+TS+Tailwind, no Preact.
- ADR-003 (proposed): Keycloak identity broker, local username/password, email verification/password recovery, Google/Facebook configured by external OAuth credentials. External provider connection is NOT preconfigured.
- ADR-004 (proposed): NestJS JWT resource server; DB role app enforces RLS; separate worker role. Same-tenant private ACL is owner-only; no share grants yet.
- ADR-005 (proposed): pgvector 768 optional Ollama embeddings; lexical FTS baseline. Ollama generation requires model installed, answer abstains when unavailable.
- ADR-006 (proposed): development Compose is one manifest; production has release gates not yet passed.
