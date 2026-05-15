# Versiones estables y compatibilidad — fuente canónica Vigilio

> **Propietario único de versiones documentales.** Auditoría de estabilidad del stack tecnológico: **2026-11-01** (consolidación formal). Esta página determina las líneas de referencia; las versiones realmente instaladas las determinan `pnpm-lock.yaml`, `composer.lock`, manifiestos, CI y la matriz de compatibilidad. **No implica una actualización automática.**

## Versiones y baselines recomendados

| Ecosistema | Referencia estable contrastada | Estado en Vigilio | Fuente oficial |
|---|---|---|---|
| Node.js | **24.22.2 LTS** | Rama LTS de producción; parche de estabilidad y seguridad (28-oct-2026) | [Node.js releases](https://nodejs.org/en/about/previous-releases) |
| NestJS | **11.x** (estable conservador) / **12.2.0** (candidato) | Adaptador nativo por defecto es Express; Fastify (`@nestjs/platform-fastify`) es opt-in explícito Vigilio | [NestJS releases](https://github.com/nestjs/nest/releases/tag/v12.2.0) |
| Zod | **4.6.7** (`^4`, estable) | Estándar Vigilio; usar APIs nativas top-level Zod 4 `z.uuid()`, `z.email()` y `z.iso.datetime()` | [Zod](https://zod.dev/) |
| PHP | **8.5.12**; alternativa soportada **8.4.27** | Propuesto Laravel nuevo; validar extensiones y Composer | [PHP downloads](https://www.php.net/downloads.php) |
| Laravel | **13.39.0** (rama 13.x) | Versión estable oficial recomendada; compatible con PHP 8.3–8.5 | [Laravel 13](https://laravel.com/docs/13.x/releases), [releases](https://github.com/laravel/framework/releases/tag/v13.39.0) |
| React Native independiente | **0.88.0**, rama actual verificada | No instalar esta rama directamente sobre Expo sin matriz | [RN releases](https://reactnative.dev/releases/overview) |
| Expo | **SDK 58** + **React Native 0.88 / React 19.3.0** | Conjunto recomendado; no subir React a 19.3.1 en mobile sin soporte oficial Expo | [Expo SDK 58](https://expo.dev/changelog/sdk-58), [tabla](https://docs.expo.dev/versions/latest/) |
| React independiente (web) | **19.3.1** | Versión final oficial para web; aislar del bundle móvil Expo | [Releases React](https://github.com/react/react/releases) |
| Preact | **v11** | Lanzamiento oficial final con hydration mejorado | [Preact 11](https://preactjs.com/blog/preact-11/) |
| Vite | **8.3.5** | Versión estable publicada en npm | [Releases Vite](https://github.com/vitejs/vite/releases) |
| Tailwind CSS | **4.3.3** | Versión final estable, motor CSS-first | [Releases Tailwind](https://github.com/tailwindlabs/tailwindcss/releases) |
| TanStack Query | **5.104.5** | Release estable publicada; patch instalado desde lockfile | [npm releases](https://www.npmjs.com/package/@tanstack/react-query) |
| TanStack Table | **9.3.1** | **Major**; migración exige `useTable` Y declarar `features` explícitas | [npm releases](https://www.npmjs.com/package/@tanstack/react-table) |
| Zustand | **v5** | Rama final estable; fijar parche exacto en lockfile | [Zustand](https://github.com/pmndrs/zustand) |
| Preact Signals | **v2** | Rama final estable para Preact | [Signals](https://github.com/preactjs/signals) |
| Drizzle ORM | **0.45.4** | Estable; mantener 0.45.4 y no adoptar 1.0.0-rc en producción | [Releases Drizzle](https://github.com/drizzle-team/drizzle-orm/releases) |
| Spatie Laravel Data | **4.23.1** | Estable v4; versión recomendada compatible con Laravel 13 | [Releases Spatie](https://github.com/spatie/laravel-data/releases) |
| PostgreSQL | **16.x** (LTS maduro) / **18.x** (despliegues nuevos) | Versión exacta y extensiones verificadas por servidor | [PostgreSQL](https://www.postgresql.org/docs/current/) |
| pgvector | **0.8.7** | Fijar versión; extensión de terceros compilada sobre PG 16/18 | [pgvector](https://github.com/pgvector/pgvector) |
| Valkey | **8.1.x** (LTS hasta 2028) | Recomendado sobre Redis standalone por licencia y soporte comunitario | [Valkey releases](https://valkey.io/docs/) |
| Redis | **7.x** | Revisar ciclo de soporte y política de licenciamiento; preferir Valkey | [Redis](https://redis.io/) |
| RabbitMQ | **4.4.x / 4.3.x** (rama 4.x) | ⚠️ Rama recomendada; línea 3.13 en fin de soporte comunitario (EOL sep-2024) | [RabbitMQ releases](https://www.rabbitmq.com/docs) |
| BullMQ | **v6** (moderna) / **v5** (LTS) | Compatible con Valkey 8.1 LTS y Redis; workers idempotentes | [BullMQ](https://docs.bullmq.io/) |
| Biome | **2.6.3** | Linter y formateador estricto de última generación; no reemplaza typecheck de `tsc` | [Biome](https://biomejs.dev/) |
| Vitest | **4.1.10** (tooling repo) / **5.0.5** (moderno) | Runner ESM/Vite de alta velocidad | [Vitest](https://vitest.dev/) |
| Playwright | **1.64.1** | Versión exacta estable auditada para E2E testing | [Playwright](https://playwright.dev/) |
| Larastan & PHPStan | **Larastan 3.13.2** + **PHPStan 2.x** | Larastan 2.x obsoleto para Laravel 13; exige PHPStan 2 | [Larastan](https://github.com/larastan/larastan) |
| Pest & PHPUnit | **Pest 5.x / 4.x** + **PHPUnit 12.x / 13.x** | PHPUnit 11 fin de soporte estándar feb 2026; Pest resuelve runner | [Pest](https://pestphp.com/) |
| pnpm | **11.20.0** (CI) / **12.15** (evaluación) | Mantener compatibilidad con runtime Node de CI antes de upgrade major | [pnpm releases](https://github.com/pnpm/pnpm/releases) |

## Historial de verificación puntual (no baseline instalado)

- En la revisión de auditoría del 2026-11-01 se consolidaron las observaciones de estabilidad de todo el stack: Node 24.22.2 LTS, PHP 8.5.12/8.4.27, Laravel 13.39.0, NestJS 11/12 (aclarando adapter Express default vs Fastify opt-in), Zod 4 (`z.uuid()`), RabbitMQ 4.x (reemplazando 3.13 EOL), pgvector 0.8.7, Valkey 8.1 LTS, Biome 2.6.3, Playwright 1.64.1 y Larastan 3.13.2 + PHPStan 2.
- Las ramas Current de Node.js no equivalen a LTS; un parche liberado tampoco garantiza compatibilidad de los adaptadores, extensiones, plugins o imágenes del consumidor.
- Cuando cambie una versión recomendada, actualizar esta tabla, sus fuentes y el gate de compatibilidad; no propagar el número manualmente a README, skills o controllers.

## Dependencias por stack: única política

- **NestJS:** `@nestjs/*` (con Fastify adapter como opt-in explícito o Express default), `nestjs-zod`, Zod 4, Drizzle, driver Postgres, Pino, OTel, Vitest; revisar API mayor, OpenAPI/Scalar, workers y capacidad de runtime. Los contratos de respuesta se derivan de Zod 4 con sintaxis nativa `z.uuid()`, `.pick()` y `createPaginatorDto()`.
- **Laravel:** Composer resuelve compatibilidad exacta de `laravel/framework` (13.39.0), Pest 5, PHPUnit 12/13, Larastan 3.13.2 con PHPStan 2.x, Pint, Sanctum, Horizon y Scalar. Horizon solo aplica a colas Redis/Valkey; RabbitMQ 4.x y SQS se operan con adapters dedicados.
- **Web MFE:** inspeccionar `package.json`, pnpm lock, toolkit Preact 11 / React 19.3.1 / Vite 8.3.5 y contratos reales. Para TanStack Table v9 declarar `features` explícitamente (`stockFeatures` o `tableFeatures`). Alinear UI y state management sin actualizar accidentalmente la pareja backend/cliente.
- **Mobile Expo:** `npx expo install --check` contra SDK 58; React Native 0.88 y React 19.3.0 deben resolver como un conjunto cerrado. No actualizar React a 19.3.1 en mobile sin certificación de Expo. EAS OTA y builds nativos necesitan comprobación.
- **Plataforma/IA:** PostgreSQL 16/18 + pgvector 0.8.7 (extensión externa con índices HNSW/GIN); Valkey 8.1.x / RabbitMQ 4.x; modelos de embeddings (Qwen3-Embedding-0.6B) y reranker (Qwen3-Reranker-0.6B) fijados por digest y dimensiones; observabilidad con Phoenix/Langfuse y runner LangGraph 1.5.2 opcional.

## Gate de actualización reproducible

1. Identificar el **stack y aplicación consumidora** exacta, runtime, `package.json`/`composer.json`, lockfile y adaptadores.
2. Comprobar release estable publicada, soporte de seguridad y matriz de dependencias; si falta evidencia, estado `PROPOSED`.
3. Actualizar un stack a la vez, sin acoplar framework, runtime y plataforma como una sola migración.
4. Ejecutar typecheck, lint, análisis estático, unit, integración, DB/caché, contratos HTTP, authz y trazas según impacto.
5. Comparar OpenAPI antes/después y comprobar frontend, móvil y workers consumidores.
6. Registrar `PASS`, `FAIL`, `BLOCKED` o `NOT_RUN` y aprobar baseline solo cuando exista evidencia reproducible.

✅ Correcto: referenciar **esta página** desde cada stack/skill; mantener snapshots YAML como artefactos de compatibilidad no autoritativos mientras los consumidores dependen de ellos; bloquear cambios incompatibles en CI.

❌ Incorrecto: fijar versiones contradictorias en controllers, README y SKILL.md; actualizar Expo y React Native por separado; afirmar que PHP 8.5 o NestJS 12 ya está desplegado porque aparece aquí; asumir que RabbitMQ 3.13 tiene soporte vigente; mezclar esquemas de validación obsoletos o invocar validadores no tipados.

**Compatibilidad existente:** [`backend-nestjs.yaml`](baselines/backend-nestjs.yaml), [`backend-laravel.yaml`](baselines/backend-laravel.yaml), [`compatibility.json`](../compatibility.json). Son snapshots o artefactos de integración, no otra fuente normativa humana. Su retirada requiere migrar primero las herramientas que los leen.

## Dependencia Laravel Data (política única)

- **Spatie Laravel Data:** biblioteca `spatie/laravel-data`, **línea v4** (4.23.1) documentada oficialmente; la versión instalada y su soporte efectivo deben verificarse en `composer.lock` y en la matriz real de Laravel/PHP antes de introducirla. No presumir que está instalada por incluir la guía. [Instalación oficial](https://spatie.be/docs/laravel-data/v4/installation-setup/), [rendimiento](https://spatie.be/docs/laravel-data/v4/advanced-usage/performance).
- ✅ Correcto: fijar versión efectiva en Composer lock y ejecutar tests, caching de estructuras y benchmarks.
- ❌ Incorrecto: convertir `Data` en ORM o en entidad de dominio, o copiar números de versión en varias guías.

## Verificación de librerías (2026-11-01) — referencia, no despliegue

**Release comprobada != runtime instalado.** Tabla contrastada contra notas oficiales y auditoría de estabilidad:

| Librería/herramienta | Referencia documentada | Acción de adopción | Release fuente |
|---|---|---|---|
| TypeScript | 7.0.2 | Propuesta de migración; el tooling actual de plataforma usa TS 6.0.3 | [GitHub TS](https://github.com/microsoft/TypeScript/releases/tag/v7.0.2) |
| Tailwind CSS | 4.3.3 | Propuesta web; migrar configuración CSS-first | [GitHub Tailwind](https://github.com/tailwindlabs/tailwindcss/releases) |
| TanStack Query | **5.104.5** | Release estable publicada; patch instalado desde lockfile | [npm releases](https://www.npmjs.com/package/@tanstack/react-query) |
| TanStack Table | **9.3.1** | **Major**; migrar `useReactTable`→`useTable` y declarar `features` explícitas | [npm releases](https://www.npmjs.com/package/@tanstack/react-table) |
| Vite | 8.3.5 | Release estable minor/patch | [Releases Vite](https://github.com/vitejs/vite/releases) |
| Vitest | 5.0.5 | **Major**; skill repo usa 4.1.10 / 4.1.9 | [Migración Vitest](https://vitest.dev/guide/migration/) |
| Zod | 4.6.7 | Estable `latest` en npm; sintaxis nativa `z.uuid()` y `z.email()` | [Releases Zod](https://github.com/colinhacks/zod/releases) |
| Drizzle ORM | 0.45.4 estable | No adoptar 1.0.0-rc como estable en producción | [Releases Drizzle](https://github.com/drizzle-team/drizzle-orm/releases) |
| Spatie Laravel Data | 4.23.1 | Estable v4; comprobada con tests PHP/Laravel 13 | [Releases Spatie](https://github.com/spatie/laravel-data/releases) |
| Expo | **SDK 58 / RN 0.88 / React 19.3.0** | Release unificada; mantener React en 19.3.0 para mobile | [Expo 58](https://expo.dev/changelog/sdk-58) |
| Preact | v11 | Major estable con pruebas de hidratación | [Preact 11](https://preactjs.com/blog/preact-11/) |
| pnpm | 11.20.0 / 12.15 | Validar soporte con versión de Node antes de migrar a pnpm 12 | [Releases pnpm](https://github.com/pnpm/pnpm/releases) |
| React independiente (web) | **19.3.1** | Estable para frontend web; no acoplar al runtime móvil | [Releases React](https://github.com/react/react/releases) |
| PostgreSQL | 16.x / 18.x | Versión exacta y extensiones por servidor | [PostgreSQL](https://www.postgresql.org/docs/current/) |
| pgvector | 0.8.7 | Fijar versión; extensión compilada sobre PG 16 y 18 | [pgvector](https://github.com/pgvector/pgvector) |
| Valkey | 8.1.x | Línea LTS con soporte comunitario hasta 2028 | [Valkey](https://valkey.io/docs/) |
| RabbitMQ | 4.x (4.3.x/4.4.x) | ⚠️ Reemplazar RabbitMQ 3.13 por fin de soporte comunitario (sep 2024) | [RabbitMQ](https://www.rabbitmq.com/docs) |
| BullMQ | v5 / v6 | v5 maduro probado; v6 línea moderna | [BullMQ](https://docs.bullmq.io/) |
| Larastan | 3.13.2 | Compatible con Laravel 13; requiere PHPStan 2.x | [Larastan](https://github.com/larastan/larastan) |
| Pest | 5.3.x | Requiere PHP 8.4+; compatible con PHPUnit 12/13 | [Pest](https://pestphp.com/) |

La presencia de una librería en `technology/libraries/` **no afirma que Vigilio la utilice** ni que su versión se encuentre instalada. [Catálogo de guías](libraries/README.md). Los pins reales se resuelven en `package.json`/`pnpm-lock.yaml`, `composer.json`/`composer.lock` y manifests de servicio.

## Modelos RAG y motores de evaluación — política de versiones (2026-11-01)

El **modelo de embeddings**, el **reranker** y el **LLM** son artefactos diferentes. No confundir nombre de familia, tag mutable, versión de SDK y digest desplegado.

| Componente | Familia/candidato documentado | Confirmación necesaria en consumidor |
|---|---|---|
| Embeddings | Qwen3-Embedding-0.6B (hasta 1024 dimensiones) | Digest/revisión, dimensión efectiva, normalización, instrucciones |
| Reranking | Qwen3-Reranker-0.6B | Runtime/protocolo compatibles (CrossEncoder), digest y calidad vs baseline; no simular endpoints Ollama |
| Modelo generativo | Ollama local o API de proveedor | Model ID/revisión, límites, costos, controles de datos |
| Vector/FTS | PostgreSQL 16/18 + pgvector 0.8.7 (extensión real por servidor) | `SELECT extversion`, índices HNSW/GIN, SQL autorizado |
| Observabilidad IA | Langfuse o Phoenix | SDK real por lockfile, privacidad, datos exportados |
| Evals | Ragas opcional / tests propios | Runner Python versionado, import/API en release instalada |
| Agentic | LangGraph **solo si aporta** | Versión del SDK/estado/runner, semántica de checkpoints |

✅ **Correcto:** fijar digest y versión efectivamente usada en cada proyecto y ejecutar pruebas de embeddings/ACL/evals en CI. ❌ **Incorrecto:** asumir que «0.6B» es un número de release inmutable, o promover Python LangGraph y JS LangGraph por igual sin pruebas.

[Modelos y reindexación](../standards/ai/model-lifecycle.md) · [Selección de arquitectura](../foundations/ai/seleccion-arquitectura-2026.md).

## Releases específicas de evaluación y agentes (verificación pública de 2026-11-01)

| Dependencia | Release estable públicamente contrastada | Adopción en Vigilio | Fuente |
|---|---|---|---|
| `@langchain/langgraph` (JavaScript) | **1.5.2** publicada en npm | **Opcional**; verificar versión real de `@langchain/core` y el checkpointer; `1.5.x` documentada | [npm LangGraph](https://www.npmjs.com/package/@langchain/langgraph) |
| `ragas` (Python runner) | **0.4.3** en PyPI | **Opcional**; evaluación offline con SDK y juez autorizados | [PyPI Ragas](https://pypi.org/project/ragas/) |
| `Qwen3-Embedding-0.6B` | **Modelo, no semver de librería** | Fijar digest/revisión efectiva; medir dimensiones y recall | [Qwen](https://github.com/QwenLM/Qwen3-Embedding) |
| `Qwen3-Reranker-0.6B` | **Modelo, no semver de librería** | Fijar revisión y runner CrossEncoder/otro compatible, sin API Ollama ficticia | [Model card](https://huggingface.co/Qwen/Qwen3-Reranker-0.6B) |

Los números son referencias **documentales**, no prueba de instalación. Antes de cambiar una dependencia ejecutar gate de la [política de adopción](libraries/README.md#protocolo-de-adopción-y-actualización).
