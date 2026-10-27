# Estado de Ingeniería v6 — Senior Mode Verificado (2026)

La matriz trazable de requisitos se encuentra en `RELEASE_AUDIT_MATRIX.md` y el informe técnico exhaustivo en `../AUDIT_REPORT.md`. Este documento aplica estrictamente `senior-completeness-auditor` (`SENIOR_COMPLETENESS.md`): **cero falsos PASS** y **versiones reales bloqueadas en lockfile**.

## 1. Versiones Reales Bloqueadas y Verificadas

- **Runtime & Calidad**: Node.js `v24.22.0` (`>=24.13.0`), TypeScript `6.0.3`, Biome `2.6.3`, Vitest `4.1.10` (`@vitest/coverage-v8 4.1.10`), Playwright `1.64.1`.
- **Backend (`apps/enterprise-rag-impl`)**: NestJS `11.1.6`, Drizzle ORM `0.45.4`, `pg 8.16.3`, BullMQ `5.73.5`, `ioredis 5.8.0`, `jose 6.2.2`, Zod `4.6.7`, `nestjs-zod 5.2.0`, Pino `10.3.1`, `prom-client 15.1.3`.
- **Frontend (`apps/enterprise-rag-web`)**: React `19.2.0`, React Router `7.9.1`, Vite `8.3.5`, Tailwind CSS `4.3.5`, TanStack Query `5.99.2`, React Hook Form `7.72.1`, `@hookform/resolvers 5.2.2`, `oidc-client-ts 3.3.0`, `lucide-react 1.16.0`.
- **Infraestructura Live Local (Podman Machine + Host)**: PostgreSQL `17.11` + `pgvector 0.8.6`, Valkey `8.1.11`, RustFS `1.0.0-alpha.82` (S3 SigV4 nativo sin AWS/MinIO), ClamAV `1.4` (`INSTREAM` TCP), Keycloak `26.5.7` (OIDC PKCE `S256` + `RS256` JWKS), Ollama (`qwen3-embedding:0.6b` `1024d` + `qwen2.5:3b`).

## 2. Verificación de Integridad y Calidad (Ejecutada en Vivo)

1. **Backend (`apps/enterprise-rag-impl`)**:
   - **Biome `2.6.3`**: `170` archivos verificados, **0 errores, 0 warnings**.
   - **TypeScript `6.0.3` & Build**: `0` errores; 5 entrypoints compilados (`dist/main.js`, `dist/outbox/main.js`, `dist/worker/main.js`, `dist/database/migrate.js`, `dist/platform/setup.js`).
   - **Arquitectura DDD de Schemas y DTOs**: Schemas canónicos de entidad Zod en `src/domain/schemas/` para todos los agregados. DTOs modulares e independientes en `src/presentation/http/dto/` heredando estrictamente de los schemas de entidad mediante `.pick()`, `.omit()` y `.extend()`. Repositorios en `src/infrastructure/persistence/repositories/` y puertos en `src/application/ports/` tipados con DTOs formales sin ningún `Record<string, unknown>`. Carpetas modulares `const/` y `types/` para los 5 dominios (`knowledge`, `conversations`, `evaluations`, `governance`, `uploads`).
   - **Vitest + Cobertura v8**: **21/21 suites (`88/88` tests PASS)** — `87.96%` statements, `70.01%` branches, `84.78%` functions, `88.47%` lines.
   - **DDD Seeder Completo (`pnpm --dir apps/enterprise-rag-impl db:seed:local`)**: `KnowledgeSeeder`, `GovernanceSeeder`, `ConversationsSeeder` y `EvaluationsSeeder` orquestados por `SeedRunner` en `infrastructure/` (bloquea `NODE_ENV=production`, cero secretos hardcodeados, respeta roles `rag_app` con RLS `app.actor_sub` y `rag_worker`, sincroniza actores demo en Keycloak 26 y genera embeddings `1024d` reales con `qwen3-embedding:0.6b` de forma 100% idempotente).
   - **Hardening SQL (`012_v6_senior_hardening.sql`)**: `FORCE ROW LEVEL SECURITY` en las 26 tablas, aislamiento intra-tenant estricto de conversaciones personales (`created_by_sub = actor_sub()`), reserva atómica `reserve_tenant_answer_budget`, `GRANT INSERT ON storage_deletions TO rag_worker` para cuarentena malware y cascadas seguras.

2. **Frontend (`apps/enterprise-rag-web`)**:
   - **Biome `2.6.3`**: `145` archivos verificados, **0 errores, 0 warnings**.
   - **TypeScript `6.0.3`, Contratos & Vite `8.3.5` Build**: `43` rutas OpenAPI sincronizadas con **0 drift**; bundle SPA compilado sin errores.
   - **Arquitectura Modular de Features**: Estructura modular completa en `src/features/{knowledge,documents,chat,conversations,evaluations,operations,security,dashboard,auth}/` con sus respectivos `schemas/*.schema.ts`, `dtos/*.dto.ts` (heredando mediante `.pick()` / `.omit()`), `const/*.const.ts`, `types/*.type.ts` y `apis/*.api.ts`. Desacoplamiento total de esquemas y llamadas API fuera de las páginas de vista (`*-page.tsx`).
   - **Vitest + Cobertura v8**: **20/20 suites (`55/55` tests PASS)** — `84.12%` statements, `72.95%` branches, `76.12%` functions, `86.92%` lines.
   - **Sistema UX/UI Senior Vercel Geist (Dark/Light + Responsive)**: Tokens semánticos CSS (`:root` Crisp Light + `.dark` Obsidian `#000000`/`#0a0a0a`/`#262626`), `ThemeProvider` + `ThemeToggle` compatible con CSP estricto (`script-src 'self'`) y persistencia directa de `data-theme` en DOM, variantes estructuradas `Skeleton` (cero CLS), `Alert`, `ToastProvider` + `useToast()`, `Modal` (`dialog` y `drawer` móvil accesible), `ConfirmDialog` (`alertdialog`) y navegación móvil deslizante en las 12 rutas.

3. **Invariantes BDD & SQL Security Gates (`prod-local/scripts/bdd-runner.mjs`)**:
   - **Cucumber Gherkin**: **6/6 escenarios PASS** (`24/24` steps).
   - **Suites SQL Zero-Trust en PostgreSQL `17.11` real**: `security-rls.sql`, `security-group-and-delete.sql`, `security-member-directory.sql`, `security-finops-and-roles.sql` — **4/4 PASS** (`10/10` total).

4. **Matriz Live Full-Stack OpenAPI (`prod-local/scripts/test-all-apis-live.mjs`)**:
   - **59/59 operaciones OpenAPI verificadas en vivo (`79/79` aserciones HTTP PASS)** contra Keycloak `26.5.7` PKCE, PostgreSQL `17.11`, Valkey `8.1.11` BullMQ, RustFS `1.0.0-alpha.82`, ClamAV `1.4` (incluyendo bloqueo EICAR en cuarentena + GC en S3) y Ollama (`qwen3-embedding:0.6b` + `qwen2.5:3b`).

5. **Suite Live Browser Playwright E2E (`prod-local/scripts/run-playwright-live.mjs`)**:
   - **10/10 pruebas E2E en navegador real PASS** sobre **Desktop Chromium** y **Mobile Chrome (`Pixel 7`)**, ejecutando primero `db:seed:local` y validando tanto el workspace sembrado (`seeded-workspace-smoke.spec.ts`) como el recorrido exhaustivo de las **12 páginas**, validaciones Zod de formularios, botones, modales, diálogos de confirmación, toasts, alertas, cambio de tema oscuro/claro, drawer móvil, subida binaria con ClamAV, versionado `v2`, búsqueda híbrida `1024d`, SSE RAG con `qwen2.5:3b`, conversaciones, evaluaciones, FinOps y RBAC (`all-pages-senior.spec.ts`).

## 3. Alcance Operativo No Ejecutable en Este Host (`NOT VERIFIED IN THIS ENVIRONMENT`)

- Unidades Linux `systemd` / Podman Quadlets de producción y emisión TLS ACME pública en `Caddy` (entorno actual: Windows 11 + Podman Machine local).
- Respaldo offsite real con `pgBackRest` contra bucket S3 externo de contingencia.
- Proveedores OAuth2 sociales externos (Google / Facebook), deshabilitados por defecto sin credenciales de terceros.
- Pruebas de carga prolongada (`k6` soak) en hardware dedicado de producción.
