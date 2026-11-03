# Changelog

All notable changes to **ATLAS** (Enterprise RAG Platform) are documented in this file.

This project adheres to [Semantic Versioning 2.0.0](https://semver.org/spec/v2.0.0.html) and [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

---

## [0.1.0-beta] - 2026-11-08

### Highlights

First public **Beta (`0.1.0-beta`)** release of **ATLAS** — an enterprise-grade, self-hosted Retrieval-Augmented Generation (RAG) platform with Zero-Trust authorization, Keycloak OIDC authentication, PostgreSQL 17 Row-Level Security (FORCE RLS), pgvector hybrid retrieval, and ClamAV quarantine scanning.

### Added

- **Enterprise Grounded Assistant:** Real-time Server-Sent Events (SSE) streaming with strict citation attribution, similarity confidence scores, latency tracking, and token consumption breakdowns.
- **Knowledge Bases & Vector Search:** Multi-tenant document indexing, chunking, and pgvector embeddings (768 dimensions) with hybrid semantic + full-text search.
- **Antivirus Quarantine Pipeline:** Mandatory ClamAV scanning and cryptographic SHA-256 deduplication for all uploaded documents before chunking and embedding.
- **Document Versioning & Granular ACLs:** Full version history (`v1`, `v2`) with user-level and group-level read/write permissions enforced at the database layer (PostgreSQL FORCE RLS).
- **LLMOps Evaluation Benchmarks:** Built-in evaluation suites measuring Faithfulness, Answer Relevance, and Context Recall across test datasets before promoting models or retrieval pipelines.
- **FinOps & Operational Reliability:** Tenant budget limits, token usage tracking, and Dead Letter Queue (DLQ) inspection with one-click failure replay.
- **Identity & Access Governance:** Keycloak 26 OIDC integration with RS256 JWT validation, organization membership roles (`Owner`, `Admin`, `Auditor`, `Operator`, `Viewer`), and team group management.
- **Adaptive Dark & Light Mode:** High-contrast, accessible themes across all operational consoles and official brand vector assets.
- **Interactive OpenAPI Documentation:** Live Scalar interactive API explorer at `/reference` with zero-trust Bearer authentication.

### Download & Install (`0.1.0-beta`)

- **Clone this release tag:**
  ```bash
  git clone --branch v0.1.0-beta https://github.com/VigilioYonatan/enterprise-rag-platform.git
  cd enterprise-rag-platform
  ```
- **Or download from GitHub Releases:** Download the `v0.1.0-beta` source archive (`.zip` or `.tar.gz`) from the repository **Releases** page and follow the Quick Start in [`README.md`](README.md).
