# Caché Laravel: Cache Repository, Redis y estrategia de invalidación

No usar `Cache::forget('products:*')`: no interpreta el wildcard. Para detalle, borrar la clave exacta. Para listados multi filtro, una generación por tenant que se incrementa con operación atómica `INCR` + TTL de entradas.

```php
<?php
// Infrastructure/Cache/RedisProductCache.php (fragmento del adapter)

declare(strict_types=1);

final class RedisProductCache
{
    public function version(int $tenant_id): int
    {
        return (int) (Redis::get("tenant:{$tenant_id}:products:version") ?: 0);
    }

    public function invalidateAfterCommit(int $tenant_id, int $product_id): void
    {
        Redis::incr("tenant:{$tenant_id}:products:version");
        Cache::store('redis')->forget("tenant:{$tenant_id}:product:{$product_id}");
    }
}
```

**Precondiciones:** mismo Redis store y prefijos correctos; el contador no debe expirar/ser evictado de forma que reactive claves antiguas (usar namespace persistente, política de evicción apropiada y tests). `INCR` por sí solo no garantiza durabilidad; para consistencia crítica emitir outbox e invalidar idempotentemente tras commit. Contar hit/miss/errores, fallback a DB ante fallo controlado. TTL de entradas con jitter; key hash de filtros + tenant y ámbito de permisos. Jamás cachear tokens o PII cruda.

Read path recomendado: verificar caché → repositorio → guardar resultado con TTL. `Cache::remember()` es adecuado para cargas simples; para cache stampede medido se puede añadir locking. Si DB consulta y Redis falla, no devolver 500 automáticamente cuando es posible degradar a DB.

## ✅ Correcto / ❌ Incorrecto: cache-invalidation

- ✅ Incrementar la versión de namespace con operación atómica y tratar los fallos tras commit.
- ❌ `KEYS *` en cada escritura o confiar en rollback de Redis como transacción SQL.
- **Gate:** Prueba: fallos antes/después del commit y concurrencia sobre generaciones.

Refactor existente: [modernización segura](../../../../standards/engineering/refactoring-existing-code.md).

## Cobertura de implementación y evidencia (ampliación)

Estas comprobaciones concretan el tema de esta guía; aplicar solo las pertinentes al sistema consumidor y documentar exclusiones justificadas.

1. **Mutation:** Invalidar cache después de commit, no antes de que la transacción sea durable.
2. **Namespace:** Incluir tenant y versión de política en clave para evitar respuestas de otro actor.
3. **Lectura:** Usar caché como optimización y conservar autorización al recuperar datos.
4. **Operación:** Medir hit ratio, stale duration y key count con límite presupuestado.
5. **Concurrencia:** Probar escritura simultánea y segunda lectura bajo invalidación cruzada.
6. **Test:** Probar fallo Redis y TTL en Feature e integración con almacenamiento real.

✅ **Correcto:** conservar el flujo funcional y demostrar criterios de aceptación con tests, trazas, revisión de contratos o un plan reproducible según el riesgo.

❌ **Incorrecto:** sustituir las reglas de negocio por un resumen, copiar implementaciones de otro framework, declarar cobertura sin evidencia o presentar `NOT_RUN` como `PASS`.

**Salida mínima:** responsable del control, riesgo cubierto, evidencia verificable y estado `PASS | FAIL | NOT_RUN | BLOCKED`. Los comandos de ejemplo son ilustrativos salvo que se adjunte ejecución real.
