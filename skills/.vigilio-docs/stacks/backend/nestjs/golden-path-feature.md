# NestJS: golden path completo para una feature Vigilio

> **Convención vigente HTTP:** schemas base solo para entidades; entradas/salidas HTTP en `*.dto.ts`; DTO `*.dto.ts` con Zod y tipo inferido en el mismo archivo; adaptador `*.doc.ts` opcional NestJS. [Fuente normativa](../../../standards/api/http-dtos-and-contracts.md). No asumir exports publicados renombrados sin migración.


Esta es la **entrada canónica**. El material extenso anterior sigue intacto en el archivo histórico enlazado al final. No duplicar DDD/SOLID y estándares comunes aquí: consultarlos en sus owners.

## Fase 0 — Contexto y contratos

1. Leer `AGENTS.md`, runtime/lockfile y ADR aplicables del consumidor.
2. Distinguir CRUD sencillo vs comportamiento DDD real (invariantes/eventos).
3. Identificar permisos y tenant; definir request, response, errores y operación OpenAPI.
4. Derivar `ProductSummary` con `Pick<ProductSchema, ...>` para Application y `createPaginatorDto(productSchema.pick(...))` para salida; los query/body HTTP usan `*.dto.ts` + DTO inferido. [Norma](../../../standards/api/http-dtos-and-contracts.md).

## Fase 1 — Implementación

```text
domain/schemas/product.schema.ts                   → `productSchema`, tipo `ProductSchema`
application/types/product-criteria.type.ts          → criterios autorizados propios
application/services/product.service.ts             → `listProducts()`/`approveProduct()`
application/ports/product.repository.ts             → Repository Port
presentation/http/dto/list-products.query.dto.ts → entrada HTTP Zod
presentation/http/dto/list-products.query.dto.ts    → Zod + `z.output`
presentation/http/dto/list-products.response.dto.ts → contrato de salida
presentation/http/dto/list-products.response.dto.ts → Zod + tipo derivado
presentation/http/controllers/product.controller.ts → HTTP + guards
presentation/http/docs/product.response.doc.ts      → OpenAPI/Scalar
infrastructure/persistence/drizzle/product.repository.ts → SQL, filtros, ACL
```

1. Controller delgado: `@UseGuards` privado, ZodQueryPipe y `@ApiOkResponse`, operationId semántico.
2. Application retorna `Promise<PageResult<ProductSummary>>` (sin importar `ResponseDto` HTTP); Presenter construye la proyección permitida. `.parse()` runtime de respuesta es decisión de frontera, no requisito para tipado.
3. Queries Drizzle aplican tenant, filtros, orden estable, count total y paginación real.
4. Mutaciones con agregado/estado + transacción y outbox si es necesario; cache-aside y coherencia post-commit.
5. Logging Pino, spans OTel y métricas transversales; no volcar request/query.

## Fase 2 — Gates

- Typecheck/lint/tests unitarios de Zod y dominio.
- Integración PostgreSQL: restricciones/tenant/filtros/total/paginación.
- Tests de autorización 401/403, serialización y OpenAPI/Scalar.
- Caché hit/miss/TTL/invalidate/concurrencia si se incorpora.
- Workers/outbox/realtime cuando el cambio impacta esos límites.
- Evidencia `PASS`, `FAIL`, `NOT_RUN` sin inventar resultados.

✅ Correcto: `listProducts`, `cancelOrder`, proyección `.pick` y auth privada; PRs pequeños y reversibles.

❌ Incorrecto: `async index()` para esconder una transición de negocio, `@Public` innecesario, `DEL('products:*')`, duplicar DTOs o crear agregado sin invariantes.

## Documentación especializada

- [Estructura](architecture/project-structure.md) · [DDD](architecture/ddd-implementation.md) · [Types/enums](architecture/constants-types-enums.md)
- [Controllers](http/controllers.md) · [Zod DTO](http/dtos-zod.md) · [Swagger/Scalar](http/swagger-scalar.md)
- [Application](application/use-cases.md) · [Drizzle](persistence/drizzle-postgresql.md) · [Caché](persistence/cache-valkey.md)
- [Testing](testing/integration-contract.md) · [OTel](runtime/pino-opentelemetry.md) · [Platform](../../../platform/README.md)

## Procedencia documental preservada

- [Capítulo heredado: 21-golden-path-feature.md](architecture/references/21-golden-path-feature.md) — contenido íntegro conservado.
- [Capítulo heredado: 6-ejemplos-codigo.md](http/references/6-ejemplos-codigo.md) — contenido íntegro conservado.

> Fuente única para **Cobertura de implementación y evidencia (ampliación)**: [abrir documento canónico](../../../governance/complete-work-coverage-policy.md).

## Presenter opcional (aclaración)

No añadir clases/ficheros `Presenter` por plantilla en CRUD simples. Usar proyección segura con DTO HTTP; mover al Presenter/mapper solo si la complejidad lo justifica. Fuente canónica: [REST](../../../standards/api/rest-endpoint-design.md).
