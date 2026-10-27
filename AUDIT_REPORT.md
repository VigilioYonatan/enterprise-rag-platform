# Auditoría Senior Zero-Omissions — Enterprise RAG Platform v6 (2026)

**ESTADO GLOBAL DE INGENIERÍA LOCAL Y FULL-STACK EN VIVO: `PASS` CON EVIDENCIA REPRODUCIBLE (`0` FALSOS PASS).**
*(Componentes exclusivos de VPS Linux externo — Caddy ACME TLS público, unidades `systemd`/Quadlets en host Linux y backup offsite `pgBackRest` — declarados explícitamente como `NOT VERIFIED IN THIS ENVIRONMENT` conforme a `docs/SENIOR_COMPLETENESS.md`).*

---

## 1. Versiones Exactas Bloqueadas y Verificadas

| Capa | Paquete / Servicio | Versión Real Verificada |
|---|---|---|
| **Runtime & Tooling** | Node.js / TypeScript / Biome / Vitest / Playwright | `v24.22.0` / `6.0.3` / `2.6.3` / `4.1.10` / `1.64.1` |
| **Backend (`enterprise-rag-impl`)** | NestJS / Drizzle ORM / BullMQ / Zod / `jose` / Pino | `11.1.6` / `0.45.4` / `5.73.5` / `4.6.7` / `6.2.2` / `10.3.1` |
| **Frontend (`enterprise-rag-web`)** | React / React Router / Vite / Tailwind CSS / TanStack Query / RHF | `19.2.0` / `7.9.1` / `8.3.5` / `4.3.5` / `5.99.2` / `7.72.1` |
| **Datos & Seguridad (Podman)** | PostgreSQL + `pgvector` / Valkey / RustFS / ClamAV / Keycloak | `17.11` + `0.8.6` / `8.1.11` / `1.0.0-alpha.82` / `1.4` / `26.5.7` |
| **Inferencia Local (Host)** | Ollama Embeddings (`1024d`) / Generación RAG | `qwen3-embedding:0.6b` / `qwen2.5:3b` |

---

## 2. Arquitectura Entregada y Mejoras Senior Implementadas

### 2.1 Backend NestJS 11 + Zero-Trust PostgreSQL RLS + DDD Seeder (`apps/enterprise-rag-impl`)
- ** Cinco repositorios lógicos estrictos**: Sin `package.json` raíz, sin `pnpm-workspace.yaml`, sin `packages/` ni `contracts/` externos, y **cero AWS SDK / cero MinIO**.
- **PostgreSQL `17.11` `FORCE ROW LEVEL SECURITY` en 26 tablas**:
  - Separación estricta de privilegios entre `rag_app` (`NOINHERIT`, `NOSUPERUSER`, `rolbypassrls = false`, `SET LOCAL app.actor_sub`) y `rag_worker` (escritura de `document_chunks`, `document_versions`, `ingestion_jobs`, `outbox_events`, `processed_events` y `storage_deletions`).
  - Endurecimiento en `012_v6_senior_hardening.sql`: cierre de fuga intra-tenant en `conversations_select` (`USING (is_tenant_member(tenant_id) AND created_by_sub = actor_sub())`), permiso `GRANT INSERT ON storage_deletions TO rag_worker` para cuarentena ClamAV y reserva presupuestaria atómica `reserve_tenant_answer_budget`.
- **DDD Seeder Completo e Idempotente (`pnpm --dir apps/enterprise-rag-impl db:seed:local`)**:
  - Ubicado exclusivamente en `infrastructure/` (`KnowledgeSeeder`, `GovernanceSeeder`, `ConversationsSeeder`, `EvaluationsSeeder`, `SeedRunner` y `src/scripts/seed-local-db.ts`), siguiendo `26-seeders-ddd.md`.
  - Rechaza `NODE_ENV === 'production'`, exige credenciales por variables de entorno (cero secretos en código), sincroniza usuarios demo (`owner.demo@atlas.local`, `admin.demo@atlas.local`, `viewer.demo@atlas.local`) en Keycloak `26.5.7` resolviendo sus `sub` reales, calcula embeddings `1024d` con `qwen3-embedding:0.6b` y converge con conteos idénticos en ejecuciones repetidas.

### 2.2 Frontend React 19 + Vercel Geist Dark/Light UX/UI + Accesibilidad (`apps/enterprise-rag-web`)
- **Sistema de Diseño Semántico Vercel Geist**:
  - Paleta Obsidian Dark (`#000000` canvas, `#0a0a0a` paneles elevados, `#262626` bordes, `#ededed` texto primario) + modo Crisp Light (`#fafafa` / `#ffffff`), sin `filter: invert()`, sin `!important` y 100% compatible con `script-src 'self'` (aplicación síncrona en módulo antes de hidratar React).
  - Primitivas reutilizables verificadas al 100%: `ThemeProvider` + `ThemeToggle` (`Claro` / `Oscuro` / `Sistema`), `Skeleton` estructurado anti-CLS (`StatCardsSkeleton`, `ListSkeleton`, `TableSkeleton`, `FormSkeleton`, `ChatSkeleton`, `PageSkeleton`) con soporte `prefers-reduced-motion`, `Alert` (`info`, `success`, `warning`, `danger`), `ToastProvider` + `useToast()`, `Modal` (`dialog` centrado + `drawer` móvil con bloqueo de scroll, foco y Escape) y `ConfirmDialog` (`role="alertdialog"`).
  - Las **12 rutas** de la consola fueron actualizadas a soporte completo Dark/Light, responsive mobile-first con header sticky y drawer de navegación móvil (`< lg`).

---

## 3. Resumen de Pruebas y Gates Ejecutados en Vivo

| Gate / Suite | Comando | Resultado Medido | Estado |
|---|---|---|---|
| **Biome Backend** | `pnpm --dir apps/enterprise-rag-impl check` | `111` archivos, `0` errores | **PASS** |
| **Typecheck & Build Backend** | `pnpm --dir apps/enterprise-rag-impl typecheck && build` | `0` errores, 5 entrypoints `dist/` | **PASS** |
| **Vitest + Cobertura Backend** | `pnpm --dir apps/enterprise-rag-impl test:coverage` | `21/21` suites, **`88/88` tests** (`87.96%` stmts, `84.78%` funcs) | **PASS** |
| **DDD Seeder Idempotencia Live** | `pnpm --dir apps/enterprise-rag-impl db:seed:local` (x2) | Keycloak 26 + `1024d` Ollama + conteos PG idénticos | **PASS** |
| **Biome Frontend** | `pnpm --dir apps/enterprise-rag-web check` | `61` archivos, `0` errores | **PASS** |
| **Contratos + Typecheck + Build Web** | `contracts:check && typecheck && build` | `43` paths OpenAPI (`0` drift), `dist/` en `435ms` | **PASS** |
| **Vitest + Cobertura Frontend** | `pnpm --dir apps/enterprise-rag-web test:coverage` | `20/20` suites, **`55/55` tests** (`84.12%` stmts, `76.12%` funcs) | **PASS** |
| **BDD Cucumber + 4 Suites SQL** | `node prod-local/scripts/bdd-runner.mjs` | `6/6` escenarios (`24/24` steps) + `4/4` suites SQL (`10/10`) | **PASS** |
| **Live Full-Stack OpenAPI Matrix** | `node prod-local/scripts/test-all-apis-live.mjs` | **`59/59` operaciones OpenAPI** (`79/79` HTTP assertions, EICAR + S3 GC + RAG) | **PASS** |
| **Live Browser Playwright E2E** | `node prod-local/scripts/run-playwright-live.mjs` | **`10/10` tests PASS** (`Desktop Chromium` + `Mobile Pixel 7`, 12 páginas + Seed) | **PASS** |
| **Delivery Verification Suite** | `python checks/verify-delivery.py` | `13/13` checks estructurales, sintácticos, BDD y offline eval | **PASS** |

---

## 4. Detalle de Cobertura Browser E2E en las 12 Páginas (`Playwright 1.64.1`)

Ejecutado mediante `prod-local/scripts/run-playwright-live.mjs` tanto en **Desktop Chromium** como en **Mobile Chrome (`Pixel 7`)**:
1. **`/` (`LoginPage`)**: Modo oscuro Vercel Geist por defecto, conmutación `Claro`/`Oscuro` persistente tras recarga y redirección OIDC PKCE `S256` hacia Keycloak `26.5.7`.
2. **`/auth/callback` (`CallbackPage`)**: Intercambio PKCE seguro tolerante a `StrictMode` y redirección a `/app`.
3. **`/app` (`DashboardPage`)**: Píldora de organizaciones accesibles, alertas Zero Trust, `ThemeToggle` en cabecera y apertura/cierre automático del drawer móvil en `Pixel 7`.
4. **`/app/knowledge` (`KnowledgePage`)**: Validación Zod (`Mínimo dos caracteres`), creación de organización, creación de KB, renombrado inline, cancelación y confirmación en `ConfirmDialog` de borrado y notificaciones `Toast`.
5. **`/app/knowledge/:id` (`DocumentPage`)**: Subida de archivo binario `.txt` a cuarentena RustFS + escaneo ClamAV -> `ready`, validación de formulario vacío e indexación de documento de texto -> `ready` con embeddings `1024d`.
6. **`/app/documents/:id` (`DocumentDetailPage`)**: Inspección de fragmento en `Modal` (`Ampliar fragmento 1`), publicación de nueva versión `v2` con reindexación automática (`Fragmento 1 · v2`), guardado de permisos ACL y diálogo de confirmación de borrado.
7. **`/app/assistant` (`AssistantPage`)**: Búsqueda híbrida FTS + `pgvector` `1024d` con score RRF y respuesta generada por streaming SSE reautorizado con `qwen2.5:3b`.
8. **`/app/conversations` (`ConversationsPage`)**: Validación de título obligatorio, creación de hilo y verificación de aislamiento intra-tenant PostgreSQL RLS (`owner` vs `admin`).
9. **`/app/conversations/:id` (`ConversationDetailPage`)**: Turno conversacional por SSE con `qwen2.5:3b`, resolución en vivo de citas autorizadas e inspección ampliada en `Modal`.
10. **`/app/evaluations` (`EvaluationsPage`)**: Validación de nombre de dataset y formato UUID, alta de caso ground-truth, corrida en vivo (`Recall@6: 100%`) e inspección de resultados por caso.
11. **`/app/operations` (`OperationsPage`)**: Guardrail FinOps contra presupuesto vacío, actualización atómica de límites diarios/USD e inspección de evento inmutable de auditoría en `Modal`.
12. **`/app/security` (`SecurityPage`)**: Validación de correo, invitación de miembro existente, promoción de rol a `admin`, creación de grupo de acceso, asignación/remoción de integrante y revocación con `ConfirmDialog`.
13. **`*` (`404` Fallback) + Logout OIDC**: Recuperación SPA hacia `/app` y cierre de sesión OIDC completo de regreso a `/`.

---

## 5. Límites Declarados Honestamente (`NOT VERIFIED IN THIS ENVIRONMENT`)

1. **TLS Público ACME en Caddy & Unidades Linux `systemd` / Podman Quadlets**: Artefactos presentes y auditados estáticamente en `enterprise-rag-deploy/`, no ejecutables nativamente sobre host Windows 11 sin VPS Linux y dominio DNS público.
2. **Backup y Restauración Offsite con `pgBackRest`**: Scripts disponibles en `platform-ops/`, pendientes de ejecución contra repositorio S3 externo de respaldo.
3. **Proveedores OAuth2 Sociales Externos (Google / Facebook)**: Soportados opcionalmente por configuración (`googleEnabled` / `facebookEnabled`), desactivados por defecto al requerir secretos de terceros.
