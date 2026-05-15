# Persistencia transaccional y datos correctos

- Una invariantes crítica debe estar protegida por constraints DB y/o transacciones con locking apropiado; `exists()` previo no reemplaza `UNIQUE`.
- En cambios multi-tabla y outbox, confirmar datos y evento en la **misma** transacción. Publicar externamente luego desde worker.
- Distinguir aggregate de tabla, read model de entity, tipos precisos para dinero (`decimal` o string exacto, no float binario como autoridad).
- Paginar con orden determinista; evitar N+1 y `SELECT *`; probar filtros, total, `next/previous` y aislamiento tenant.
- Migraciones `expand → deploy compatible → backfill → verificar → contract` con rollback y backup. Nunca renombrar columna usada por aplicación en la misma release.

[Repository Laravel](../../stacks/backend/laravel/persistence/eloquent-postgresql.md) · [Drizzle](../../stacks/backend/nestjs/persistence/references/15-migrations-db.md).

## ✅ Correcto / ❌ Incorrecto: revisión 2026

- ✅ **Correcto:** Filtros y orden determinista, parámetros vinculados, transacciones con control de concurrencia e integración real.
- ❌ **Incorrecto:** N+1, SQL construido con interpolación de entrada externa, `count` de página presentado como total sin especificar semántica.
- **Al recibir código existente:** primero caracterizar el comportamiento, después refactorizar en pasos comprobables. [Guía canónica de modernización](../engineering/refactoring-existing-code.md).

## Caso mínimo: transición con concurrencia

1. Consultar por `id` **y** `tenant_id`, bloquear la fila (`FOR UPDATE`) o usar versión optimista.
2. Ejecutar `aggregate.processProduct()` y guardar en la **misma transacción DB**; ningún worker o Redis forma parte automáticamente de ella.
3. Publicar mediante outbox transaccional cuando sea obligatoria la entrega; invalidar caché tras confirmar.
4. Reintentar sólo errores transitorios identificados; nunca repetir operaciones no idempotentes sin clave de deduplicación.

```sql
-- ✅ Correcto: CAS optimista; affected_rows=0 implica concurrencia o estado no permitido.
UPDATE products
SET estado = 'procesado', version = version + 1
WHERE id = $1 AND tenant_id = $2 AND version = $3 AND estado = 'pendiente';
```

❌ No emitir un `UPDATE` por ID sin tenant y confiar en una Policy HTTP como único control. La autorización y el scope de consultas son complementarios.

> Fuente única para **Cobertura de implementación y evidencia (ampliación)**: [abrir documento canónico](../../governance/complete-work-coverage-policy.md).

