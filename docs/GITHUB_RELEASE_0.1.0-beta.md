# GitHub Repository & Release Metadata (`v0.1.0-beta`)

Use the exact values below when configuring the **GitHub Repository "About" sidebar** and publishing the **`v0.1.0-beta` Release** so users can immediately understand and download ATLAS.

---

## 1. GitHub Repository "About" Description (<= 160 characters)

```text
Zero-Trust Enterprise RAG: query confidential company documents with verified citations, database-enforced multi-tenant isolation, and zero cloud data leaks.
```

### Suggested GitHub Topics

```text
rag, enterprise-rag, pgvector, keycloak, zero-trust, rls, clamav, self-hosted, llmops, finops, typescript, react, nestjs, postgresql, docker-compose
```

---

## 2. Create & Push Annotated Git Tag (`v0.1.0-beta`)

```bash
git tag -a v0.1.0-beta -m "ATLAS v0.1.0-beta — Enterprise RAG Platform"
git push origin v0.1.0-beta
```

---

## 3. Ready-to-Paste GitHub Release Notes (`v0.1.0-beta`)

**Release Title:** `ATLAS v0.1.0-beta — Self-Hosted Zero-Trust Enterprise RAG Platform`  
**Pre-release checkbox:** :white_check_mark: *Set as a pre-release* (recommended for `-beta` versions)

```markdown
## ATLAS `v0.1.0-beta` (Public Beta)

Self-hosted Enterprise Retrieval-Augmented Generation (RAG) platform with Zero-Trust authorization, Keycloak OIDC authentication, PostgreSQL 17 Row-Level Security (FORCE RLS), pgvector hybrid retrieval, and ClamAV quarantine scanning — **100% self-hosted on your own infrastructure**.

### :sparkles: What's Included in `0.1.0-beta`
- **Enterprise Grounded Assistant:** Real-time Server-Sent Events (SSE) streaming with verifiable citation attribution, similarity confidence scores, and token latency tracking.
- **Knowledge Bases & Vector Search:** Multi-tenant document indexing, chunking, and pgvector embeddings (768 dimensions) with hybrid semantic + full-text search.
- **Antivirus Quarantine Pipeline:** Mandatory ClamAV scanning and cryptographic SHA-256 deduplication for all uploaded documents before chunking and embedding.
- **Document Versioning & Granular ACLs:** Full version history (`v1`, `v2`) with user-level and group-level read/write permissions enforced at the database layer (PostgreSQL FORCE RLS).
- **LLMOps Evaluation Benchmarks:** Built-in evaluation suites measuring Faithfulness, Answer Relevance, and Context Recall across test datasets before promoting models or retrieval pipelines.
- **FinOps & Operational Reliability:** Tenant budget limits, token usage tracking, and Dead Letter Queue (DLQ) inspection with one-click failure replay.
- **Identity & Access Governance:** Keycloak 26 OIDC integration with RS256 JWT validation, organization membership roles (`Owner`, `Admin`, `Auditor`, `Operator`, `Viewer`), and team group management.
- **Adaptive Dark & Light Mode:** High-contrast, accessible themes across all operational consoles and official brand vector assets.
- **Interactive OpenAPI Documentation:** Live Scalar interactive API explorer at `/reference` with zero-trust Bearer authentication.

### :package: Quick Download & Run
1. Download **`Source code (zip)`** or **`Source code (tar.gz)`** below (or run `git clone --branch v0.1.0-beta <repo-url>`).
2. Follow the **Download & Get Started** steps in [`README.md`](../../README.md) to open `http://localhost:8080`.

See [`CHANGELOG.md`](../../CHANGELOG.md) for full details.
```
