# Laravel: escritura masiva Eloquent/Query Builder sin perder DDD

Esta guía es específica de **Laravel**. Estrategias generales y medición: [SQL canónico](../../../../standards/data/sql-performance.md). Versión desde [technology/versions.md](../../../../technology/versions.md). Spatie Data sirve a Request/Response; **no debe procesar millones de filas como entidad Eloquent por registro**.

## Importación incremental y memoria estable

```php
<?php
use Illuminate\Support\Facades\DB;

$batch_size = 1000;
$batch = [];

foreach ($rows_iterator as $row) {
    $batch[] = [
        'id' => $row['id'],
        'tenant_id' => $tenant_id, // desde contexto confiable
        'nro_poliza' => $row['nro_poliza'],
    ];

    if (count($batch) >= $batch_size) {
        DB::table('products')->insert($batch);
        $batch = [];
    }
}

if ($batch !== []) {
    DB::table('products')->insert($batch);
}
```

`$rows_iterator` debe ser un iterador/stream, **no un arreglo previamente cargado con un millón de filas**. Ejemplo parcial: antes de producción añadir validación por fila, claves únicas, transacciones por unidad de negocio, idempotencia, control de errores, observabilidad y reanudación; `tenant_id` jamás se acepta directamente del CSV sin autorización.

## Upsert y deduplicación

```php
DB::table('products')->upsert(
    $batch,
    ['tenant_id', 'external_id'],
    ['nro_poliza'],
);
```

Requiere un índice UNIQUE coherente con `(tenant_id, external_id)` y que las filas realmente incluyan `external_id`. No reinsertar con `insertOrIgnore` para esconder errores de integridad sin análisis. Para leer y actualizar registros, preferir `chunkById()` / `lazyById()` frente a `chunk()` con offset; revisar qué ocurre si cambia la PK.

## COPY frente a Query Builder

Cuando el dataset es muy grande, usar **COPY vía herramienta/driver de PostgreSQL a staging** puede superar muchos lotes de `insert()`. Laravel Query Builder no expone un API COPY genérica equivalente: diseñar una ruta explícita y segura para esa operación, con validación/tenant, auditoría, reconciliación, encoding, límites y plan de recuperación. No componer SQL/paths de usuario sin sanitizar.

## Gate comprobable

- ✅ **Correcto:** medir lotes 250/500/1000/2000/5000 en entorno representativo; normalizar contratos; no usar `save()` una vez por fila en un millón de filas.
- ✅ **Correcto:** `upsert` con UNIQUE real, reintentos idempotentes y límites de conexiones/cola.
- ❌ **Incorrecto:** paralelizar miles de jobs sin controlar WAL/locks o dejar un único lote gigantesco con rollback inesperado.
- ❌ **Incorrecto:** reemplazar Application/Domain por acceso SQL directo en cualquier caso de uso crítico: crear un proceso bulk específico con invariantes y trazabilidad aprobadas.

**Pruebas requeridas:** conteos, duplicados, errores inyectados, reinicio del worker, integridad por tenant, p95 del OLTP, WAL, lag y memoria estable. **Estado:** `NOT_RUN` hasta ejecutarlas en consumidor real.

Fuente: [Laravel Query Builder](https://laravel.com/framework/docs/13.x/queries).
