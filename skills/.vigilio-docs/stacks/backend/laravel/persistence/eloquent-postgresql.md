# Eloquent + PostgreSQL: adapter sin acoplar dominio

> **Referencia canónica actualizada:** [Puertos Laravel](../architecture/typed-domain-and-ports.md) · [SQL compartido](../../../../standards/data/sql-performance.md). Los fragmentos anteriores conservados tienen valor de procedencia; adoptar esta guía para nuevos cambios.

```php
<?php
// Application/Ports/ProductReadRepository.php

declare(strict_types=1);
namespace App\Modules\Products\Application\Ports;

use App\Modules\Products\Application\DTOs\ProductFilters;
use App\Modules\Products\Application\DTOs\ProductPage;

interface ProductReadRepository
{
    public function listProducts(ProductFilters $filters, int $tenant_id): ProductPage;
}
```

```php
<?php
// Infrastructure/Persistence/EloquentProductReadRepository.php

declare(strict_types=1);
namespace App\Modules\Products\Infrastructure\Persistence;

use App\Modules\Products\Application\Ports\ProductReadRepository;
use App\Modules\Products\Application\DTOs\ProductFilters;
use App\Modules\Products\Application\DTOs\ProductListItem;
use App\Modules\Products\Application\DTOs\ProductPage;

final class EloquentProductReadRepository implements ProductReadRepository
{
    public function listProducts(ProductFilters $filters, int $tenant_id): ProductPage
    {
        $base = ProductRecord::query()
            ->where('tenant_id', $tenant_id)
            ->when($filters->status, fn ($q, $status) => $q->where('estado', $status));
        $total = (clone $base)->count();
        $rows = $base->orderBy('id')->offset($filters->offset)->limit($filters->limit)
            ->get(['id', 'nro_poliza', 'product_type']);
        $items = $rows->map(fn ($row) => new ProductListItem(
            (int) $row->id, (string) $row->nro_poliza, (string) $row->product_type,
        ))->all();
        $nextOffset = $filters->offset + count($items);
        $next = $nextOffset < $total ? (string) $nextOffset : null;
        $previous = $filters->offset > 0 ? (string) max(0, $filters->offset - $filters->limit) : null;
        return new ProductPage($items, $total, $next, $previous);
    }
}
```

El contrato `next/previous` aquí representa offset serializado; si el OpenAPI requiere URI o cursor, adaptar de forma consistente (no publicar offset como URL). Añadir índices `(tenant_id,estado,id)` según consulta real. Evitar N+1, masas de datos, PII, float monetario. DB constraints `UNIQUE(tenant_id, nro_poliza)` y `NOT NULL` cuando aplican. Integración con PostgreSQL real, no SQLite asumido idéntico.

## ✅ Correcto / ❌ Incorrecto: revisión 2026

- ✅ **Correcto:** Filtros y orden determinista, parámetros vinculados, transacciones con control de concurrencia e integración real.
- ❌ **Incorrecto:** N+1, SQL construido con interpolación de entrada externa, `count` de página presentado como total sin especificar semántica.
- **Al recibir código existente:** primero caracterizar el comportamiento, después refactorizar en pasos comprobables. [Guía canónica de modernización](../../../../standards/engineering/refactoring-existing-code.md).

## Mejoras técnicas verificables — 2026

**16. Eloquent con constraints y N+1 controlado.** ✅ Eager loading selectivo, `chunkById` según dataset, índices adecuados y tests PostgreSQL; proyección API mediante Resource. ❌ `Model::all()` para millones de filas, repetir `$model->relation` sin precarga o suponer que una Collection protege contra permisos.

## Rendimiento de cargas masivas

Ver [bulk-ingest](bulk-ingest.md) para batches, `upsert` y streaming; consultar [optimización SQL compartida](../../../../standards/data/sql-performance.md). ✅ Medir con datos representativos. ❌ Hacer un millón de llamadas Eloquent `save()` sin necesidad.
