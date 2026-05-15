# Catálogo canónico de librerías y APIs vigentes

> **Fuente documental única por dependencia.** Cada guía enlaza release notes oficiales, formas actuales de integración, antipatrones y migración. No se inventa estado de instalación ni se promueve un RC a estable.

## Protocolo de adopción y actualización

1. Inspeccionar manifiesto + lockfile, versiones transitivas, runtime, Expo/PHP/Node y la guía de upgrade exacta del mayor inicial al final.
2. Comparar APIs, imports, hooks, adapters, build, SSR/hidratación, typings y formatos de datos. Cambiar solo una dependencia o conjunto compatible.
3. Actualizar un stack propietario: los ejemplos NestJS no se copian a Laravel y las interfaces de React web no se copian a React Native.
4. Ejecutar análisis estático, tests, integraciones con datos reales cuando aplique, pruebas de seguridad, permisos, costos y rollout/rollback.
5. Publicar contratos versionados cuando cambian exports. Enlazar documentos propietarios desde skills en lugar de duplicar bloques.
6. Registrar PASS / FAIL / BLOCKED / NOT_RUN y las dependencias que no se pudieron verificar.

## Criterios de validación

- **PASS:** ejecutado y evidenciado con runtime y lockfile del proyecto consumidor.
- **FAIL:** contrato, test, migración o compatibilidad incumplida.
- **BLOCKED:** falta fuente o entorno para confirmar compatibilidad.
- **NOT_RUN:** documentación preparada, sin compilación ni test consumidor.

✅ Correcto: `ProductSchema` inferido de Zod, DTO Zod+tipo en `*.dto.ts`, Drizzle en `*.table.ts`, versiones resueltas por lockfile, operaciones DDD semánticas.
❌ Incorrecto: `any`, casts sobre entrada externa sin validación, imports de API legacy no soportada, Tailwind 3 copiado sobre Tailwind 4, Table v8 presentado como v9, `latest` en CI sin gate.

## Guías por ecosistema

### Frontend web / MFE

- [Preact Signals — Vigilio línea instalada + compat Preact 11](preact-signals.md)
- [Preact — Vigilio 11 (mayor estable)](preact.md)
- [Radix UI — Vigilio línea instalada; revisar @radix-ui/* efectivas](radix-ui.md)
- [React Hook Form — Vigilio v7 (comprobar lockfile; alternativo a TanStack Form)](react-hook-form.md)
- [React — Vigilio web 19.3.1; Expo 58 fija React 19.3.0](react.md)
- [Tailwind CSS — Vigilio 4.3.3 (estable verificado, 2026-10-25)](tailwind-css.md)
- [TanStack Form — Vigilio línea instalada (verificar API por lockfile)](tanstack-form.md)
- [TanStack Query — Vigilio v5 (última línea documentada; patch por lockfile)](tanstack-query.md)
- [TanStack Router — Vigilio línea instalada; validar compatibilidad de file routing](tanstack-router.md)
- [TanStack Table — Vigilio v9 (estable; migración v8→v9 confirmada)](tanstack-table.md)
- [Vite — Vigilio 8.3.5 estable verificado](vite.md)
- [Zustand — Vigilio línea instalada; solo para estado cliente](zustand.md)
- [shadcn/ui — Vigilio componentes distribuidos; CLI y dependencias por proyecto](shadcn-ui.md)

### Backend NestJS / Node

- [BullMQ — Vigilio v6 (moderna) / v5 (LTS) compatible con Valkey y Redis](bullmq.md)
- [Drizzle Kit — Vigilio línea compatible con Drizzle ORM 0.45.x](drizzle-kit.md)
- [Drizzle ORM — Vigilio 0.45.4 estable; 1.0.0-rc no es estable](drizzle-orm.md)
- [NestJS + Zod Adapter — Vigilio línea compatible NestJS 12 / Zod 4](nestjs-zod.md)
- [NestJS — Vigilio 11.x (conservador) / 12.2.0 (candidato) con Express default](nestjs.md)
- [Pino — Vigilio línea instalada y adaptador Nest versionado](pino.md)
- [Socket.IO — Vigilio v4 línea instalada; verificar patch](socket-io.md)

### Backend Laravel / PHP

- [Composer — Vigilio 2.x (instalada según composer.lock)](composer.md)
- [Eloquent ORM — Vigilio Laravel 13.x, adaptador de infraestructura](eloquent.md)
- [Laravel Framework — Vigilio 13.39.0 estable (PHP 8.3–8.5 oficialmente)](laravel-framework.md)
- [Laravel Horizon — Vigilio rama compatible Laravel 13; requiere Redis](laravel-horizon.md)
- [Laravel Pint — Vigilio línea compatible con PHP/Laravel del proyecto](laravel-pint.md)
- [Laravel Reverb — Vigilio rama compatible Laravel 13](laravel-reverb.md)
- [Laravel Sanctum — Vigilio línea compatible Laravel 13](laravel-sanctum.md)
- [PHP — Vigilio 8.5.12 (recomendado seguridad) / 8.4.27 (alternativa soportada)](php.md)
- [Spatie Laravel Data — Vigilio 4.23.1 estable verificado](spatie-laravel-data.md)

### Pruebas TypeScript

- [Mock Service Worker — Vigilio v2 (verificar patch)](msw.md)
- [Playwright — Vigilio 1.64.1 estable verificado](playwright.md)
- [Vitest — Vigilio 5.0.5 estable verificado](vitest.md)

### Pruebas PHP

- [PHPStan + Larastan — Vigilio Larastan 3.13.2 + PHPStan 2.x (Laravel 13)](phpstan-larastan.md)
- [PHPUnit — Vigilio 12.x / 13.x (gestionado vía Pest 5 / PHP 8.4+)](phpunit.md)
- [Pest — Vigilio 5.3.x; requiere PHP 8.4+](pest.md)

### Expo / React Native

- [Expo FileSystem — Vigilio API orientada a File/Directory en SDK moderno](expo-file-system.md)
- [Expo ImagePicker — Vigilio versión seleccionada por Expo SDK 58](expo-image-picker.md)
- [Expo Router — Vigilio versión compatible con Expo SDK 58](expo-router.md)
- [Expo SecureStore — Vigilio línea SDK 58 compatible](expo-secure-store.md)
- [Expo Updates / EAS — Vigilio línea SDK 58 compatible](expo-updates.md)
- [Expo — Vigilio SDK 58; RN 0.88 + React 19.3.0](expo.md)
- [React Native Gesture Handler — Vigilio versión determinada por Expo SDK 58](react-native-gesture-handler.md)
- [React Native Reanimated — Vigilio versión determinada por Expo SDK 58](react-native-reanimated.md)
- [React Native — Vigilio Expo 58 fija RN 0.88; standalone 0.88 requiere gate](react-native.md)

### Persistencia y SQL

- [PostgreSQL — Vigilio 18.x (18.6 reportada; confirmar compatibilidad del servidor)](postgresql.md)
- [Valkey / Redis-compatible — Vigilio línea runtime según manifiesto, protocolo y cliente](valkey.md)
- [pgvector — Vigilio 0.8.7 propuesta; verificar extensión realmente instalada](pgvector.md)

### Observabilidad

- [Grafana — Vigilio línea OSS/Cloud según despliegue](grafana.md)
- [OpenTelemetry JS/PHP — Vigilio SDK y semantic conventions por compatibilidad](opentelemetry.md)
- [Prometheus — Vigilio línea por stack observabilidad](prometheus.md)
- [prom-client — Vigilio línea Node instalada](prom-client.md)

### Plataforma / DevSecOps

- [AWS CDK — Vigilio v2 línea por lockfile](aws-cdk.md)
- [Docker Buildx — Vigilio línea Docker Engine/BuildKit por runner](docker-buildx.md)
- [GitHub Actions — Vigilio Actions por commit SHA/verificada](github-actions.md)
- [Helm — Vigilio 3.x o 4.x según cluster/chart, gate de upgrade](helm.md)
- [Kubernetes — Vigilio versión exacta del cluster/compatibility matrix](kubernetes.md)
- [Terraform — Vigilio línea por lockfile/providers](terraform.md)

### IA y RAG

- [Arize Phoenix — Vigilio línea compatible OpenTelemetry/LLM SDK](arize-phoenix.md)
- [Langfuse — Vigilio línea self-hosted/cloud de proyecto](langfuse.md)
- [Ollama — Vigilio versión de runtime local por imagen/digest](ollama.md)

### Toolchain y calidad

- [Biome — Vigilio 2.6.3 estable verificado](biome.md)
- [pnpm — Vigilio 12.15 (línea mayor estable, gate de adopción)](pnpm.md)

### Contratos compartidos

- [Zod — Vigilio 4.6.7 estable](zod.md)


### Complementos presentes en los stacks

- [lightweight-charts](lightweight-charts.md) — Frontend web / MFE
- [OGL WebGL](ogl.md) — Frontend web / MFE
- [Wouter](wouter.md) — Frontend web / MFE
- [Testing Library](testing-library.md) — Pruebas TypeScript
- [NativeWind](nativewind.md) — Expo / React Native
- [AWS SDK JS v3](aws-sdk-v3.md) — Plataforma / DevSecOps
- [Scalar API Reference](scalar.md) — Backend NestJS / Node
- [@nestjs/swagger](nestjs-swagger.md) — Backend NestJS / Node

### Lenguajes

- [TypeScript](../catalog/typescript.md)
- [PHP](../catalog/php.md)

### Referencias compartidas

- [Versiones y baselines aprobables](../versions.md)
- [DDD](../../foundations/architecture/ddd.md)
- [DTO HTTP Zod](../../standards/api/http-dtos-and-contracts.md)
- [CI/CD Laravel](../../stacks/backend/laravel/quality/ci-quality.md)

> Compatibilidad: `_site` y `vigilio-skills/assets/docs` son copias de publicación; no son segundas fuentes normativas. Las guías de este catálogo son documentación, no un inventario de dependencias instaladas.

## Criterios obligatorios para la generación de código (2026-10-25)

Las **71 guías del catálogo inicial** documentan hasta ocho ejemplos operativos y cuatro pares **❌ Incorrecto / ✅ Correcto**; las **cuatro guías especializadas de IA** priorizan contratos/SDK reales, migraciones y pruebas según su plataforma. Las cifras de ejemplos por archivo se verifican en la matriz de auditoría, no se presuponen para cualquier guía futura. La selección de una librería depende del proyecto consumidor: **primero leer lockfile/package.json/composer.lock/infra manifests**, luego abrir la guía específica y comprobar APIs y peers. En versiones con breaking changes (por ejemplo, TanStack Table 8→9 o Tailwind 3→4), el código de una versión anterior solo es referencia histórica; no se promueve como estándar vigente. El contenido de una guía no autoriza un upgrade automático.


## Estado de cobertura y límites — 25 de octubre de 2026

- **75 guías de librerías** (71 de catálogo inicial + 4 especializadas en IA); el inventario detalla ejemplos, APIs/migraciones y evidencia por archivo. Ninguna guía equivale por sí sola a una suite compilada.
- **Verificación fechada de release solo para familias con evidencia:** consultar la matriz que acompaña la entrega. En otras librerías, `VERIFY_LOCKFILE` significa que el patch exacto **no está corroborado**; la skill debe bloquear sustituciones inseguras.
- **Corrección de SDK:** Expo 58 se lanzó el 15-10-2026; React Native 0.88 y React 19.3.0. [Notas oficiales](https://expo.dev/changelog/sdk-58).
- **Web independiente:** React 19.3.1 publicado en octubre de 2026; no imponer ese patch a Expo. [Release](https://github.com/react/react/releases).
- Para usar el catálogo en una skill: abrir primero [`versions.md`](../versions.md), identificar lockfile y luego la guía propietaria; otras skills solo enlazan esa fuente.

## Modelos, recuperación, evaluación y agentes de IA

El stack propietario se selecciona en [IA: elección de arquitectura](../../foundations/ai/seleccion-arquitectura-2026.md). La API de cada modelo/herramienta se documenta **una vez** y se enlaza desde skills:

- [Qwen3 Embedding — 0.6B, dimensiones, Ollama `/api/embed`, reindexación](qwen3-embedding.md)
- [Qwen3 Reranker — contrato de scores y servidor real](qwen3-reranker.md)
- [Ragas 0.4.3 — collections API y evaluación reproducible](ragas.md)
- [LangGraph JS 1.5.x — workflows, checkpoints y migración](langgraph.md)
- [pgvector](pgvector.md) · [Ollama](ollama.md) · [Langfuse](langfuse.md) · [Phoenix](arize-phoenix.md)

✅ **Correcto:** cotejar lockfiles/digest y documentación oficial de la versión utilizada. ❌ **Incorrecto:** mezclar modelos de embedding y reranking o traer APIs de una release no instalada.

## Auditoría de integridad del catálogo

- [Cobertura y control de versiones por las 75 bibliotecas](AUDITORIA_COBERTURA_2026-10-25.md).
- Cada guía cuenta con ✅ Correcto, ❌ Incorrecto, ejemplos de código, fuente pública y recomendación de compatibilidad; los ejemplos **no** se han compilado como aplicaciones de los consumidores.
- **Versión estable publicada**, **versión propuesta documental** y **versión instalada por lockfile** se auditan por separado; no asumir que coinciden.
