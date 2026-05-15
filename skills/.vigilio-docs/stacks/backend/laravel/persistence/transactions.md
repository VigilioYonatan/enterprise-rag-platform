# Laravel: transacciones, concurrencia y migraciones

Usar `DB::transaction()` para `findForUpdate`, transición de agregado y escritura de outbox. Lock efectivo con `lockForUpdate()` dentro de transacción. En operaciones de update sin agregado, `UPDATE ... WHERE version = ?` y comprobar rowcount evita lost updates.

```php
DB::transaction(function () use ($product_id, $tenant_id, $repository) {
    $product = $repository->findForUpdate($product_id, $tenant_id);
    if ($product === null) { throw new ProductNotFound(); }
    $product->process();
    $repository->save($product, $tenant_id);
    // Guardar mensaje outbox en misma transacción si hay publicación.
}, attempts: 3);
// Después del commit: invalidar caché o procesar outbox con garantías.
```

`attempts: 3` sólo reintenta deadlocks soportados por Laravel; no usar para reintentar efectos externos dentro de callback. Constraints PostgreSQL siguen obligatorios. Migrations expand-contract con rollback y backups, claves foráneas/únicas, cuidado de locks en DDL de tablas grandes. Transacciones/connection boundaries deben probarse bajo concurrencia real y multi-tenant.

> Fuente única para **Correcto / Incorrecto: revisión 2026**: [abrir documento canónico](../../../../governance/documentation-dry-and-ownership.md).


## Ejemplo de comando con transacción

```php
<?php
$result = DB::transaction(function () use ($tenant_id, $product_id, $repository) {
    $product = $repository->findForUpdate($product_id, $tenant_id);
    if ($product === null) {
        throw new ProductNotFound($product_id);
    }
    $product->process();
    $repository->save($product, $tenant_id);
    // Si el evento es esencial, insertar fila de outbox en esta misma transacción.
    return $product->status();
});
// ✅ Ejecutar invalidación no transaccional sólo tras commit confirmado.
$cache->invalidateProducts($tenant_id, $product_id);
```

Los imports/clases pertenecen al módulo consumidor. Si el caché falla tras commit, el DB ya fue escrito; no devolver ingenuamente rollback ni fingir atomicidad. Usar outbox/reintentos para fiabilidad estricta. Probar transiciones simultáneas.

> Fuente única para **Cobertura de implementación y evidencia (ampliación)**: [abrir documento canónico](../../../../governance/complete-work-coverage-policy.md).

### ✅ Correcto / ❌ Incorrecto — Laravel: transacciones, concurrencia y migraciones

✅ **Correcto:** Para **Laravel: transacciones, concurrencia y migraciones**, mantener Domain desacoplado de Eloquent y ejecutar Composer/Pint/PHPStan/tests.

❌ **Incorrecto:** En **Laravel: transacciones, concurrencia y migraciones**, duplicar DTOs PHP o reutilizar comandos de Node como si fueran Laravel.
