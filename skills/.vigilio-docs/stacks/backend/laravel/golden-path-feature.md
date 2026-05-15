# Golden Path Laravel 13: productos con lectura, DDD, caché y contratos

## Caso de uso A: GET /products?limit=25

1. `FormRequest::rules()` valida limit/offset/estado; `filters()` transforma a `ProductFilters` tipado.
2. Policy `viewAny` autoriza; controller `listProducts()` pasa `tenant_id` explícito.
3. `ListProducts` usa `ProductReadRepository::listProducts`; si hay evidencia de beneficio, agrega `ProductCache` con namespace tenant/versión/filtros.
4. Adapter Eloquent filtra tenant, ordena determinísticamente, pagina y retorna `ProductPage` de `ProductListItem` (sin campos privados).
5. Presenter/Resource mapea allowlist a `ListProductsResponseDto` definido en Zod y exportado a OpenAPI/Scalar. No `.parse()` de salida obligatoria: contract tests en CI.
6. Logs/traces auto y pruebas unit/feature/integration.

Referencias: [HTTP](http/controllers.md), [validación](http/form-requests.md), [read models](application/read-models.md), [persistencia](persistence/eloquent-postgresql.md), [cache](persistence/cache-invalidation.md).

## Caso de uso B: POST /products/{id}/process

1. Autenticar, Policy por recurso y tenant. Nombre `processProduct`, no `update`.
2. Dentro de transacción, repository con lock/versión recupera agregado; `Product::process()` comprueba `Pending -> Processed`.
3. Guardar agregado, registrar outbox si evento externo y commit.
4. Tras confirmación: invalidación fiable por clave exacta de detalle y generación de listados; si falla Redis, reintento/outbox según SLO.
5. `409` de conflicto de dominio; `401/403/404/422` según límites; respuestas conformes OpenAPI.

Referencias: [DDD](../../../foundations/architecture/ddd.md), [Use Cases](application/use-cases.md), [transacciones](persistence/transactions.md), [mensajería](messaging/queues-outbox.md).

## Definition of Done

- PHP 8.5 + Laravel 13 realmente compatibles y `composer.lock` reproducible.
- Tests dominio, permisos por tenant, integración PostgreSQL, invalidación caché, OpenAPI diff, static/Pint/Pest, audit e instrumentación.
- Declarar resultados verdaderos y evidencias; no confundir esta guía de referencia con implementación ya desplegada.

## ✅ Correcto / ❌ Incorrecto: revisión 2026

- ✅ **Correcto:** Mantener invariantes en el agregado cuando existan; nombre semántico y ports desacoplados de framework/ORM.
- ❌ **Incorrecto:** DDD ceremonial para CRUD trivial, lógica de dominio en controller, repositorio retornando mensajes HTTP del negocio sin necesidad.
- **Al recibir código existente:** primero caracterizar el comportamiento, después refactorizar en pasos comprobables. [Guía canónica de modernización](../../../standards/engineering/refactoring-existing-code.md).

> Fuente única para **Cobertura de implementación y evidencia (ampliación)**: [abrir documento canónico](../../../governance/complete-work-coverage-policy.md).

