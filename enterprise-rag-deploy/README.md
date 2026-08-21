# `enterprise-rag-deploy` — Vigilio Level 1 (`compose-vps`) Deployment Repository

Repositorio lógico de despliegue autohospedado sobre **Rootless Podman (`podman compose`)** (con fallback compatible a `docker compose`), segmentado en **3 redes aisladas** (`edge`, `backend` `internal: true`, `observability` `internal: true`) y almacenamiento de objetos privado **RustFS (`rustfs/rustfs`, Apache-2.0)**.

## Componentes principales

- **Plano de datos interno (`backend` — `internal: true`, cero puertos públicos):**
  - `postgres` (`pgvector/pgvector:pg17` con roles separados `rag_app`, `rag_worker`, `keycloak` y `FORCE ROW LEVEL SECURITY`)
  - `rustfs` (`rustfs/rustfs`, S3 API privada `:9000` autenticada con SigV4)
  - `valkey` (`valkey/valkey:8.1.11-alpine` con AOF y contraseña obligatoria)
  - `clamav` (`clamav/clamav:1.4`, escaneo antivirus obligatorio previo a promoción `quarantine/ -> clean/`)
  - `ollama` (perfil `llm`: `gemma3:4b`, `qwen3-embedding:0.6b`, `qwen3-reranker:0.6b`)
- **Workloads de aplicación (Distroless Node 24 `nonroot` `65532:65532` + Caddy rootless `:8080`):**
  - `migrate` (`--profile tools`, one-shot `dist/database/migrate.js`)
  - `platform-setup` (`--profile tools`, one-shot `dist/platform/setup.js` asegurando bucket privado en RustFS)
  - `api` (`dist/main.js`)
  - `outbox` (`dist/outbox/main.js`, relay transaccional + reaper de leases vencidos)
  - `worker` (`dist/worker/main.js`, ingesta asíncrona y GC de objetos)
  - `web` + `caddy` (SPA con `/config.js` en runtime y CSP estricta)
- **Observabilidad (`--profile observability`, red `observability` `internal: true`):**
  - `prometheus`, `alertmanager`, `loki`, `alloy`, `otel-collector`, `tempo`, `grafana` (`127.0.0.1:3001`)
