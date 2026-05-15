# Backend NestJS — implementación canónica multistack (2026)

> **Versiones centralizadas:** consultar [technology/versions.md](../../../technology/versions.md). Los números que aparecen en ejemplos anteriores son históricos, no el baseline activo.

**Ruta de referencia para nuevas features NestJS.** DDD/SOLID, seguridad, caching, testing y DevSecOps compartidos se definen en `foundations/` y `standards/`. `stacks/backend/nestjs/` contiene las implementaciones en TypeScript, NestJS, Zod, Drizzle y Valkey. Los **49 capítulos completos** se reubicaron junto a su tema en `references/` de `stacks/`, `standards/`, `technology/`, `platform/` y `playbooks/`. No queda un directorio histórico global; Lambda/CDK no se confunde con EKS.

## Guías especializadas

| Capacidad | Guía nueva |
| --- | --- |
| Estructura DDD | [Estructura de módulos](architecture/project-structure.md) |
| DDD y agregados | [DDD en NestJS](architecture/ddd-implementation.md) |
| Types/constantes/enums | [Tipos y constantes](architecture/constants-types-enums.md) |
| Inyección de dependencias | [DI y tokens](architecture/dependency-injection.md) |
| HTTP y autorización | [Controllers](http/controllers.md) |
| Zod, DTO y .pick | [Contratos Zod](http/dtos-zod.md) |
| Documentación | [Swagger + Scalar](http/swagger-scalar.md) |
| Errores | [Excepciones HTTP](http/exception-handling.md) |
| Servicios y queries | [Casos de uso](application/use-cases.md) |
| Ports | [Repository ports](application/repository-ports.md) |
| Base de datos | [Drizzle + PostgreSQL](persistence/drizzle-postgresql.md) |
| Transacciones | [Migraciones y transacciones](persistence/transactions-migrations.md) |
| Caché | [Valkey/Redis](persistence/cache-valkey.md) |
| Seguridad | [Guards y tenancy](security/guards-authorization.md) |
| Testing | [Vitest unitario](testing/unit-vitest.md) y [integración/contratos](testing/integration-contract.md) |
| Runtime | [Bootstraps](runtime/bootstrap-http-workers.md), [configuración](runtime/configuration.md), [observabilidad](runtime/pino-opentelemetry.md) |
| Mensajería | [Outbox/SQS](messaging/outbox-sqs.md) y [Realtime](messaging/realtime-sse-websocket.md) |
| existente | [Refactor existente](quality/refactoring-workflow.md) |
| Feature end-to-end | [Golden path](golden-path-feature.md) y [tutorial extendido](reference-feature-products.md) |
| Migración sin pérdidas | [Mapa 1:1 de documentos anteriores](migration-content-map.md) |

## Dueños de políticas globales

- [DDD](../../../foundations/architecture/ddd.md) · [SOLID](../../../foundations/architecture/solid.md) · [Clean Architecture](../../../foundations/architecture/clean-architecture.md).
- [Contratos](../../../standards/api/contracts.md) · [Cache invalidation](../../../standards/caching/invalidation.md) · [Testing](../../../standards/testing/contract-and-bdd.md) · [Seguridad multitenant](../../../standards/security/tenant-isolation.md).
- [Versiones y baseline](../../../technology/catalog/nestjs.md) · [Plataforma](../../../platform/README.md) · [Migración](../../../playbooks/migrate-nestjs-to-multistack.md).

✅ Correcto: tomar norma compartida una vez y especializar su implementación NestJS; el agent puede consultar el capítulo histórico con los ejemplos originales.

❌ Incorrecto: duplicar reglas DDD en NestJS/Laravel, copiar versión Node a 30 archivos, o tratar las páginas antiguas como la única guía activa.

## Índice histórico conservado

El índice anterior se reubicó en `references/README.md`; sus capítulos siguen íntegros y se consultan desde el mapa de migración.


Esta carpeta es **la fuente canónica de implementación NestJS**. Los capítulos anteriores se conservan en las ubicaciones identificadas por el [mapa de migración](migration-content-map.md); la carpeta [references/](references/README.md) reúne material técnico complementario, no otra norma universal.

- [Controller, DTO y OpenAPI](controllers-dtos.md)
- [Casos de uso semánticos + DDD](use-cases-ddd.md)
- [Persistencia y caché](persistence-cache.md)
- [Testing y observabilidad](testing-observability.md)

Se conservan `productSchema.pick()`, `createPaginatorDto()`, `z.infer`, tipado de salida `Promise<ListProductsResponseDto>` sin parse runtime obligatorio, Zod query coercion restringida, `*DocDto` exclusivo de Swagger/Scalar, repository ports y agregados para invariantes reales. El baseline de consumidor no cambia automáticamente a NestJS 12.

> Fuente única para **Correcto / Incorrecto: revisión 2026**: [abrir documento canónico](../../../governance/documentation-dry-and-ownership.md).


## Cómo consultar las guías completas

Este directorio es la **entrada canónica de implementación NestJS**. Las guías principales explican el golden path y las [referencias completas reubicadas](migration-content-map.md) conservan todos los capítulos extensos sin constituir otra política normativa.

1. Crear Controller, DTO y documentación: [controllers y contratos](controllers-dtos.md) y [código completo](http/references/6-ejemplos-codigo.md).
2. Nombrar casos de uso DDD: [use cases](use-cases-ddd.md), [DDD transversal](../../../foundations/architecture/ddd.md).
3. Persistencia/cache: [persistence-cache](persistence-cache.md) y [cache original](persistence/references/9-cache.md).
4. Testing/OTel: [testing-observability](testing-observability.md).
5. Revisar la documentación por baseline real antes de copiar un ejemplo histórico.

> Fuente única para **Cobertura completa y navegación por escenario**: [abrir documento canónico](../laravel/README.md).


## SQL performance y escrituras masivas

- [Bulk import con Drizzle](persistence/bulk-ingest.md) — inserción por lotes, idempotencia y backpressure.
- [Guía general SQL](../../../standards/data/sql-performance.md) — fuente compartida de optimización y medición; no duplicar motores.



## Actualización canónica de DDD/DRY y SQL

[Schemas Zod y tipos derivados](architecture/schema-derived-types.md) · [Controllers/DTOs y paginadores](http/semantic-dtos-and-pagination.md) · [Drizzle](persistence/drizzle-conventions.md) · [Eventos](messaging/event-envelopes.md)

✅ Seguir rutas canónicas para implementar nuevos casos de uso. ❌ Copiar nombres CRUD o schemas duplicados desde ejemplos históricos sin revisión.

- [DTOs HTTP únicos (Zod+tipo) y `OrderSchema`](../../../standards/api/http-dtos-and-contracts.md) — referencia normativa transversal para nuevas features.

## Dependencias versionadas del stack

No duplicar aquí APIs externas; cuando se use una librería, abrir su documentación canónica:

- [nestjs](../../../technology/libraries/nestjs.md)
- [zod](../../../technology/libraries/zod.md)
- [drizzle-orm](../../../technology/libraries/drizzle-orm.md)
- [drizzle-kit](../../../technology/libraries/drizzle-kit.md)
- [pino](../../../technology/libraries/pino.md)
- [opentelemetry](../../../technology/libraries/opentelemetry.md)

✅ Correcto: comprobar compatibilidad real con runtime y lockfile. ❌ Incorrecto: copiar snippets legacy de un framework distinto.

## Estándares transversales vigentes — contratos y comentarios

- [REST, rutas y endpoints complejos](../../../standards/api/rest-endpoint-design.md): contrato HTTP y controles por riesgo, sin duplicar arquitectura en el stack.
- [Comentarios/JSDoc/PHPDoc](../../../standards/engineering/code-comments-and-docstrings.md): explicar decisiones y riesgos; contrato API público en OpenAPI.
