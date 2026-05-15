# Laravel — implementación Vigilio

> **Versiones centralizadas:** consultar [technology/versions.md](../../../technology/versions.md). Los números que aparecen en ejemplos anteriores son históricos, no el baseline activo.

Baseline **propuesto** indicado en [technology/versions.md](../../../technology/versions.md), pendiente de Composer y smoke tests del consumidor. DDD pragmático; `listProducts()` para lectura; `approvePolicy()`/`processProduct()` cuando hay una operación real; dominio libre de dependencias Laravel.

## Rutas de implementación

- [Estructura y separación DDD](architecture/project-structure.md), [Enums, constantes y types](architecture/enums-constants-types.md), [DI](architecture/dependency-injection.md)
- [Controllers y rutas](http/controllers.md), [Form Requests](http/form-requests.md), [Proyecciones y DTO](http/api-resources.md), [Scalar + OpenAPI](http/openapi-scalar.md), [Errores](http/errors.md)
- [Use cases semánticos](application/use-cases.md), [Read models y paginador](application/read-models.md)
- [PostgreSQL/Eloquent](persistence/eloquent-postgresql.md), [transacciones](persistence/transactions.md), [cache](persistence/cache-invalidation.md)
- [Autorización/Sanctum](security/sanctum-policies.md), [queues/outbox](messaging/queues-outbox.md)
- [Tests](testing/testing-strategy.md), [calidad/Composer](quality/ci-quality.md), [observabilidad](runtime/observability.md), [EKS + PHP-FPM](runtime/deployment.md)
- [Golden Path completo](golden-path-feature.md)

Reglas generales [DDD](../../../foundations/architecture/ddd.md), [seguridad](../../../standards/security/authorization.md), [contratos](../../../standards/api/contracts.md), [testing](../../../standards/testing/strategy.md), [caché](../../../standards/caching/cache-aside.md). No inventar plugins ni prometer tests sin correrlos.

## ✅ Correcto / ❌ Incorrecto: revisión 2026

- ✅ **Correcto:** Leer contexto real, seguir normas canónicas y documentar precondiciones, ejemplos, contraejemplos y verificación.
- ❌ **Incorrecto:** Copiar snippets sin imports, asumir versiones instaladas o declarar pruebas `PASS` sin ejecutarlas.
- **Al recibir código existente:** primero caracterizar el comportamiento, después refactorizar en pasos comprobables. [Guía canónica de modernización](../../../standards/engineering/refactoring-existing-code.md).

## Cobertura completa y navegación por escenario

- [Matriz aplicable de prácticas, riesgos y aceptación](testing/e2e-http.md) — seleccionar todas las pertinentes; una guía breve o un índice no equivalen a una implementación terminada.

✅ Correcto: seguir el estándar y registrar evidencia. ❌ Incorrecto: detenerse en los primeros tres ejemplos.

## DTOs Spatie Data y SQL masivo

- [Request/Response con Spatie Data](http/spatie-data.md) — alternativa a Form Requests y Resources para contratos numerosos; dominio y persistencia separados.
- [Bulk insert / upsert de Eloquent](persistence/bulk-ingest.md) — importación incremental, checkpoints y límites de carga.
- [80+ prácticas SQL compartidas](../../../standards/data/sql-performance.md) — fuente canónica; evita duplicación con NestJS.



## Actualización canónica de DDD/DRY y SQL

[Domain y puertos](architecture/typed-domain-and-ports.md) · [HTTP Spatie semántico](http/semantic-spatie-contracts.md) · [Bulk SQL](persistence/bulk-ingest.md)

✅ Seguir rutas canónicas para implementar nuevos casos de uso. ❌ Copiar nombres CRUD o schemas duplicados desde ejemplos históricos sin revisión.

**Implementación propia del tema:** [CI Laravel/PHP con gates reales](quality/ci-quality.md).

## Dependencias versionadas del stack

No duplicar aquí APIs externas; cuando se use una librería, abrir su documentación canónica:

- [laravel-framework](../../../technology/libraries/laravel-framework.md)
- [spatie-laravel-data](../../../technology/libraries/spatie-laravel-data.md)
- [eloquent](../../../technology/libraries/eloquent.md)
- [laravel-sanctum](../../../technology/libraries/laravel-sanctum.md)
- [pest](../../../technology/libraries/pest.md)
- [laravel-pint](../../../technology/libraries/laravel-pint.md)

✅ Correcto: comprobar compatibilidad real con runtime y lockfile. ❌ Incorrecto: copiar snippets legacy de un framework distinto.

## Estándares transversales vigentes — contratos y comentarios

- [REST, rutas y endpoints complejos](../../../standards/api/rest-endpoint-design.md): contrato HTTP y controles por riesgo, sin duplicar arquitectura en el stack.
- [Comentarios/JSDoc/PHPDoc](../../../standards/engineering/code-comments-and-docstrings.md): explicar decisiones y riesgos; contrato API público en OpenAPI.
