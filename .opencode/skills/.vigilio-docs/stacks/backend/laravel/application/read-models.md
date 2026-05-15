# Application: query DTOs, read models y paginación

Un listado paginado no necesita agregado rico si sólo lee datos. Repository retorna datos internos explícitos, service compone un resultado tipado; Resource adapta campos al JSON público.

```php
<?php
// Application/DTOs/ProductListItem.php

declare(strict_types=1);
namespace App\Modules\Products\Application\DTOs;

final readonly class ProductListItem
{
    public function __construct(
        public int $id,
        public string $policyNumber,
        public string $product_type,
    ) {}
}
```

```php
<?php
// Application/DTOs/ProductPage.php

declare(strict_types=1);
namespace App\Modules\Products\Application\DTOs;

/** @phpstan-type ProductListItems list<ProductListItem> */
final readonly class ProductPage
{
    /** @param list<ProductListItem> $items */
    public function __construct(
        public array $items,
        public int $total,
        public ?string $next,
        public ?string $previous,
    ) {}
}
```

`count` representa **total filtrado**, no `count(items)` a menos que contrato público se defina explícitamente distinto. Offset debe tener límite máximo y orden estable `(created_at,id)`; considerar keyset cursor para tablas grandes. Incluye tenant y permisos en consultas y cache keys. Validar casting Eloquent vs. tipos PHP: no usar `(int)` para datos inválidos silenciosamente.

## ✅ Correcto / ❌ Incorrecto: revisión 2026

- ✅ **Correcto:** Leer contexto real, seguir normas canónicas y documentar precondiciones, ejemplos, contraejemplos y verificación.
- ❌ **Incorrecto:** Copiar snippets sin imports, asumir versiones instaladas o declarar pruebas `PASS` sin ejecutarlas.
- **Al recibir código existente:** primero caracterizar el comportamiento, después refactorizar en pasos comprobables. [Guía canónica de modernización](../../../../standards/engineering/refactoring-existing-code.md).

> Fuente única para **Cobertura de implementación y evidencia (ampliación)**: [abrir documento canónico](../../../../governance/complete-work-coverage-policy.md).

