# NestJS: repository ports, Drizzle y caché real

Repository de lectura retorna read models; service/presenter crea JSON `ListProductsResponseDto` sin parse obligatorio cuando contrato confiable y validado en CI. Un repository puede devolver el DTO de lectura en CRUD pragmático si no necesita acoplamiento de HTTP, pero evitar `success` y metadatos HTTP desde query SQL.

- Cache-aside con TTL y `CachePort`, keys por tenant/filtros/versiones, invalidación tras commit.
- `DEL('prefix:*')` inválido para patrones: invalidar claves exactas o usar generación de namespace con incremento atómico más TTL.
- Outbox para eventos críticos con transacción e idempotencia; workers/SQS independientes.
- PostgreSQL constraints y transacciones; evitar `SELECT *`, PII en logs y cache.

[Drizzle](persistence/references/15-migrations-db.md) · [Cache fuente](persistence/references/9-cache.md) · [Workers](messaging/references/45-workers-outbox-sqs.md).

## ✅ Correcto / ❌ Incorrecto: revisión 2026

- ✅ **Correcto:** Keys con tenant, filtros, versiones y TTL; invalidación exacta o por generaciones después de commit; probar hit/miss/stampede.
- ❌ **Incorrecto:** `DEL("products:*")` o `Cache::forget("products:*")`, key sin tenant o Redis dentro de falsa transacción SQL.
- **Al recibir código existente:** primero caracterizar el comportamiento, después refactorizar en pasos comprobables. [Guía canónica de modernización](../../../standards/engineering/refactoring-existing-code.md).

## Implementación y límites

1. Repository Port devuelve datos de lectura/agregados apropiados; el DTO HTTP se forma en aplicación o presenter cuando hay desacoplamiento real.
2. Queries Drizzle parametrizadas, scope por tenant, orden determinista y paginación con `total` o cursor definidos.
3. CachePort con TTL, hit/miss y key basada en filtros/permisos/tenant. `cache.del('items:*')` no borra por wildcard.
4. Invalidación después de commit y outbox cuando se requiere entrega fiable. Probar carreras de repoblado e invalidación.

✅ Retornar `Promise<ListProductsResponseDto>` desde el caso de uso/Controller sin `.parse()` repetido cuando se tipa únicamente; derivar Zod con `.pick()`. ❌ Exponer rows enteros al público o tratar `rows.length` como total filtrado sin especificarlo.

Para código existente consultar [persistencia original](http/references/6-ejemplos-codigo.md) y [caché](persistence/references/9-cache.md).

> Fuente única para **Cobertura de implementación y evidencia (ampliación)**: [abrir documento canónico](../../../governance/complete-work-coverage-policy.md).

