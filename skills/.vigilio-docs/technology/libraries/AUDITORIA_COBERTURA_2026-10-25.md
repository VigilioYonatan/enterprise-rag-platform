# Auditoría de cobertura del catálogo de 75 bibliotecas

**Fecha:** 2026-10-25. **Objeto:** verificar contenido existente en las guías canónicas sin confundirlo con compilación de aplicaciones ni confirmar versiones instaladas.

- **75 guías verificadas por recorrido de archivo:** 75 cumplen criterios mínimos de estructura (≥3 bloques de código, ✅ Correcto, ❌ Incorrecto, ≥3 secciones, link oficial/fuente, migración y gates).
- **Criterios de estructura:** no prueban que cada ejemplo compile, que todas las APIs estén exhaustivamente cubiertas ni que el patch usado por una app sea compatible.
- **Versiones:** las versiones exactas de las pocas releases contrastadas se registran en [versions.md](../versions.md); el *estado real* requiere lockfile, stack/imagen y pruebas de migración.
- **No modificar automáticamente versiones de consumidores.** Para cambios mayores ejecutar QA, compatibilidad, seguridad y rollback.

## Estado por guía

| Guía | Líneas | Código | ✅ / ❌ | Estructura | Runtime |
|---|---:|---:|---:|---|---|
| [arize-phoenix.md](arize-phoenix.md) | 255 | 10 | 15/7 | SI | NOT_RUN |
| [aws-cdk.md](aws-cdk.md) | 351 | 18 | 17/8 | SI | NOT_RUN |
| [aws-sdk-v3.md](aws-sdk-v3.md) | 275 | 19 | 15/7 | SI | NOT_RUN |
| [biome.md](biome.md) | 276 | 15 | 14/6 | SI | NOT_RUN |
| [bullmq.md](bullmq.md) | 272 | 17 | 14/6 | SI | NOT_RUN |
| [composer.md](composer.md) | 270 | 16 | 14/6 | SI | NOT_RUN |
| [docker-buildx.md](docker-buildx.md) | 272 | 17 | 14/6 | SI | NOT_RUN |
| [drizzle-kit.md](drizzle-kit.md) | 261 | 11 | 14/6 | SI | NOT_RUN |
| [drizzle-orm.md](drizzle-orm.md) | 357 | 22 | 14/7 | SI | NOT_RUN |
| [eloquent.md](eloquent.md) | 277 | 18 | 14/6 | SI | NOT_RUN |
| [expo-file-system.md](expo-file-system.md) | 275 | 15 | 14/6 | SI | NOT_RUN |
| [expo-image-picker.md](expo-image-picker.md) | 269 | 15 | 14/6 | SI | NOT_RUN |
| [expo-router.md](expo-router.md) | 250 | 10 | 14/6 | SI | NOT_RUN |
| [expo-secure-store.md](expo-secure-store.md) | 264 | 14 | 14/6 | SI | NOT_RUN |
| [expo-updates.md](expo-updates.md) | 250 | 10 | 14/6 | SI | NOT_RUN |
| [expo.md](expo.md) | 311 | 17 | 16/8 | SI | NOT_RUN |
| [github-actions.md](github-actions.md) | 297 | 18 | 14/6 | SI | NOT_RUN |
| [grafana.md](grafana.md) | 242 | 6 | 14/6 | SI | NOT_RUN |
| [helm.md](helm.md) | 265 | 15 | 14/6 | SI | NOT_RUN |
| [kubernetes.md](kubernetes.md) | 252 | 10 | 14/6 | SI | NOT_RUN |
| [langfuse.md](langfuse.md) | 247 | 6 | 15/7 | SI | NOT_RUN |
| [langgraph.md](langgraph.md) | 156 | 5 | 3/3 | SI | NOT_RUN |
| [laravel-framework.md](laravel-framework.md) | 322 | 19 | 16/8 | SI | NOT_RUN |
| [laravel-horizon.md](laravel-horizon.md) | 254 | 11 | 14/6 | SI | NOT_RUN |
| [laravel-pint.md](laravel-pint.md) | 261 | 13 | 14/6 | SI | NOT_RUN |
| [laravel-reverb.md](laravel-reverb.md) | 248 | 9 | 14/6 | SI | NOT_RUN |
| [laravel-sanctum.md](laravel-sanctum.md) | 258 | 12 | 14/6 | SI | NOT_RUN |
| [lightweight-charts.md](lightweight-charts.md) | 248 | 14 | 14/6 | SI | NOT_RUN |
| [msw.md](msw.md) | 284 | 18 | 14/6 | SI | NOT_RUN |
| [nativewind.md](nativewind.md) | 237 | 11 | 14/6 | SI | NOT_RUN |
| [nestjs-swagger.md](nestjs-swagger.md) | 250 | 13 | 14/6 | SI | NOT_RUN |
| [nestjs-zod.md](nestjs-zod.md) | 256 | 11 | 14/6 | SI | NOT_RUN |
| [nestjs.md](nestjs.md) | 292 | 17 | 14/6 | SI | NOT_RUN |
| [ogl.md](ogl.md) | 243 | 13 | 14/6 | SI | NOT_RUN |
| [ollama.md](ollama.md) | 263 | 13 | 15/7 | SI | NOT_RUN |
| [opentelemetry.md](opentelemetry.md) | 278 | 15 | 14/6 | SI | NOT_RUN |
| [pest.md](pest.md) | 272 | 14 | 14/6 | SI | NOT_RUN |
| [pgvector.md](pgvector.md) | 280 | 15 | 15/7 | SI | NOT_RUN |
| [php.md](php.md) | 312 | 19 | 15/7 | SI | NOT_RUN |
| [phpstan-larastan.md](phpstan-larastan.md) | 249 | 8 | 14/6 | SI | NOT_RUN |
| [phpunit.md](phpunit.md) | 256 | 12 | 14/6 | SI | NOT_RUN |
| [pino.md](pino.md) | 273 | 17 | 14/6 | SI | NOT_RUN |
| [playwright.md](playwright.md) | 305 | 18 | 14/7 | SI | NOT_RUN |
| [pnpm.md](pnpm.md) | 293 | 18 | 15/7 | SI | NOT_RUN |
| [postgresql.md](postgresql.md) | 293 | 18 | 15/7 | SI | NOT_RUN |
| [preact-signals.md](preact-signals.md) | 268 | 15 | 14/6 | SI | NOT_RUN |
| [preact.md](preact.md) | 265 | 13 | 14/6 | SI | NOT_RUN |
| [prom-client.md](prom-client.md) | 279 | 17 | 14/6 | SI | NOT_RUN |
| [prometheus.md](prometheus.md) | 251 | 10 | 14/6 | SI | NOT_RUN |
| [qwen3-embedding.md](qwen3-embedding.md) | 162 | 5 | 3/3 | SI | NOT_RUN |
| [qwen3-reranker.md](qwen3-reranker.md) | 140 | 5 | 3/3 | SI | NOT_RUN |
| [radix-ui.md](radix-ui.md) | 262 | 14 | 14/6 | SI | NOT_RUN |
| [ragas.md](ragas.md) | 146 | 5 | 3/3 | SI | NOT_RUN |
| [react-hook-form.md](react-hook-form.md) | 269 | 16 | 14/6 | SI | NOT_RUN |
| [react-native-gesture-handler.md](react-native-gesture-handler.md) | 256 | 12 | 14/6 | SI | NOT_RUN |
| [react-native-reanimated.md](react-native-reanimated.md) | 260 | 13 | 14/6 | SI | NOT_RUN |
| [react-native.md](react-native.md) | 269 | 15 | 15/7 | SI | NOT_RUN |
| [react.md](react.md) | 285 | 17 | 15/7 | SI | NOT_RUN |
| [scalar.md](scalar.md) | 252 | 5 | 16/7 | SI | NOT_RUN |
| [shadcn-ui.md](shadcn-ui.md) | 249 | 10 | 14/6 | SI | NOT_RUN |
| [socket-io.md](socket-io.md) | 261 | 14 | 14/6 | SI | NOT_RUN |
| [spatie-laravel-data.md](spatie-laravel-data.md) | 340 | 18 | 15/8 | SI | NOT_RUN |
| [tailwind-css.md](tailwind-css.md) | 385 | 23 | 16/8 | SI | NOT_RUN |
| [tanstack-form.md](tanstack-form.md) | 266 | 15 | 14/6 | SI | NOT_RUN |
| [tanstack-query.md](tanstack-query.md) | 374 | 21 | 15/8 | SI | NOT_RUN |
| [tanstack-router.md](tanstack-router.md) | 261 | 14 | 14/6 | SI | NOT_RUN |
| [tanstack-table.md](tanstack-table.md) | 374 | 20 | 15/7 | SI | NOT_RUN |
| [terraform.md](terraform.md) | 262 | 14 | 14/6 | SI | NOT_RUN |
| [testing-library.md](testing-library.md) | 247 | 14 | 14/6 | SI | NOT_RUN |
| [valkey.md](valkey.md) | 266 | 15 | 14/6 | SI | NOT_RUN |
| [vite.md](vite.md) | 282 | 16 | 14/6 | SI | NOT_RUN |
| [vitest.md](vitest.md) | 336 | 19 | 14/7 | SI | NOT_RUN |
| [wouter.md](wouter.md) | 241 | 13 | 14/6 | SI | NOT_RUN |
| [zod.md](zod.md) | 371 | 21 | 15/8 | SI | NOT_RUN |
| [zustand.md](zustand.md) | 260 | 13 | 14/6 | SI | NOT_RUN |

## Dictamen y límites

**✅ Correcto:** una fuente de documentación por dependencia, ejemplos contextualizados en esa release, marcas ✅ Correcto / ❌ Incorrecto y enlaces desde skills.

**❌ Incorrecto:** presentar «75 guías = 75 librerías instaladas y compiladas»; deducir versiones efectivas de páginas públicas; convertir RC en baseline; afirmar compatibilidad de React Native con paquetes web sin la matriz de Expo.

La auditoría de estructura es automatizada. Se revisaron manualmente los cuatro documentos de IA añadidos en la revisión y ejemplos de alto riesgo de Tailwind, TanStack Query/Table, Zod, Drizzle y Spatie. El resto tiene *documentación* amplia en el paquete base, pero sus ejemplos no se han ejecutado contra proyectos consumidores. Los test E2E de cada librería y la compilación cross-stack siguen **NOT_RUN**.

**Fuentes oficiales verificadas:** [TypeScript releases](https://github.com/microsoft/TypeScript/releases), [Tailwind releases](https://github.com/tailwindlabs/tailwindcss/releases), [TanStack Table](https://tanstack.com/table/latest/docs/framework/react/guide/migrating), [TanStack Query](https://www.npmjs.com/package/@tanstack/react-query), [Ragas](https://pypi.org/project/ragas/), [LangGraph](https://www.npmjs.com/package/@langchain/langgraph), [Qwen model card](https://huggingface.co/Qwen/Qwen3-Reranker-0.6B).
