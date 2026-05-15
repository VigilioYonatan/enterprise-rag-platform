---
name: enterprise-rag-senior-2026
description: SuperSkill para construir, auditar, probar y operar la plataforma Enterprise RAG v6 con NestJS, React, PostgreSQL FORCE RLS, RustFS, Rootless Podman y Keycloak.
owner: enterprise-rag-platform
lifecycle: project-specific
routing_ecosystems: node-nest,react,compose,podman
routing_keywords: "enterprise rag,pgvector,full text search,citaciones,rls,rustfs,podman,keycloak,finops,dlq,evaluacion"
---

# Enterprise RAG Senior 2026 — SuperSkill de Gobernanza y Ejecución

## 0. Autoridad y Alcance
Esta skill gobierna la arquitectura, implementación, verificación y release de **Enterprise RAG Platform v6**.
- **Cinco repositorios lógicos**:
  1. `apps/enterprise-rag-impl`: Backend NestJS 11 (5 entrypoints: `main.js`, `outbox/main.js`, `worker/main.js`, `database/migrate.js`, `platform/setup.js`).
  2. `apps/enterprise-rag-web`: Frontend React 19 + Vite + Tailwind CSS 4 + TanStack Query 5 + React Hook Form + Zod 4.
  3. `enterprise-rag-deploy`: Infraestructura productiva cloud-neutral (Rootless Podman Compose, RustFS S3, Valkey, PostgreSQL, Keycloak, ClamAV, Caddy TLS, Prometheus, Grafana, Tempo, Loki, Alloy).
  4. `platform-ops`: Ansible playbooks y roles (`podman_rootless_host`, `edge_firewall`, `pgbackrest_pitr`), scripts de backup cifrado y simulacro de restore.
  5. `prod-local`: Laboratorio local sin dependencias en la nube (`preflight.mjs`, `bdd-runner.mjs`, `static-audit.py`, `e2e-authorized-retrieval.mjs`, `test.ps1`, `up.ps1`, `down.ps1`).

- **Reglas innegociables**:
  - **Zero AWS / Zero Kubernetes**: La infraestructura es autohospedada sobre VPS / bare-metal usando Rootless Podman o Docker Compose como fallback.
  - **Zero bypass de seguridad**: Autenticación vía Keycloak OpenID Connect (`RS256` JWT). Zero trust en capa HTTP y en workers.
  - **PostgreSQL FORCE ROW LEVEL SECURITY**: Activado en las 26 tablas del sistema. Ni siquiera los dueños de tablas pueden saltarse las políticas RLS. Aislamiento estricto multi-tenant y ACL granular a nivel de usuario y grupo de acceso (`is_document_grantee()`).
  - **RustFS S3**: Almacenamiento de objetos S3 Apache-2.0 puro con firmado SigV4 nativo en Node 24 sin depender de SDKs pesados de AWS ni MinIO privativo.
  - **Contratos OpenAPI 3.1**: 43 endpoints sincronizados con cero drift entre backend y frontend.
  - **Honestidad de evidencia**: En ausencia de runtime de contenedores activo en la máquina host, reportar `BLOCKED / NOT_RUN` honestamente; nunca emitir falsos `PASS`.

## 1. Ciclo de Ejecución Senior / Staff
DISCOVER → BASELINE → SPEC → DESIGN → BUILD → VERIFY → REVIEW (read-only) → FIX → RE-VERIFY → AUDIT → RELEASE.

## 2. Puntos de Verificación Obligatorios
1. `pnpm check` (Biome CI): 0 errores de formateo o linting.
2. `pnpm typecheck` (TypeScript strict mode): 0 errores de tipos en backend y frontend.
3. `pnpm test` (Vitest): Cobertura completa de servicios verticales, DTOs, filtros, firmado SigV4, métricas y UI.
4. `pnpm openapi:diff` y `pnpm contracts:check`: Verificación de las 43 rutas contra el esquema OpenAPI.
5. `bdd-runner.mjs`: Comprobación de invariantes de seguridad en todos los escenarios Gherkin.
6. `test_groundedness.py`: Evaluación offline de citaciones, fidelidad y relevancia sintética.
