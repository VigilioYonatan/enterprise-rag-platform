# Use Cases Laravel: listProducts y processProduct con DDD real

> **Referencia canónica actualizada:** [DDD Laravel semántico y repositorios](../architecture/typed-domain-and-ports.md). Los fragmentos anteriores conservados tienen valor de procedencia; adoptar esta guía para nuevos cambios.

El nombre expresa intención del usuario, no el verbo CRUD del ORM. El domain es dueño de la transición; el service coordina transacción y puertos.

```php
<?php
// Domain/Entities/Product.php

declare(strict_types=1);
namespace App\Modules\Products\Domain\Entities;

use App\Modules\Products\Domain\Enums\ProductStatus;
use App\Modules\Products\Domain\Exceptions\InvalidProductState;

final class Product
{
    public function __construct(public readonly int $id, private ProductStatus $status) {}

    public function process(): void
    {
        if ($this->status !== ProductStatus::Pending) {
            throw new InvalidProductState('Invalid transition');
        }
        $this->status = ProductStatus::Processed;
    }

    public function status(): ProductStatus { return $this->status; }
}
```

```php
<?php
// Application/Ports/ProductWriteRepository.php

declare(strict_types=1);
namespace App\Modules\Products\Application\Ports;

use App\Modules\Products\Domain\Entities\Product;

interface ProductWriteRepository
{
    public function findForUpdate(int $id, int $tenant_id): ?Product;
    public function save(Product $product, int $tenant_id): void;
}
```

`ProcessProduct` abre `DB::transaction()` en una unidad de trabajo/adaptador, obtiene `findForUpdate`, llama `$product->process()`, persiste, confirma y **entonces** invalida caché o delega a outbox fiable. No envolver Redis en la transacción SQL ni prometer atomicidad entre stores. Los resultados API (`success`, `status`, etc.) los forma el presenter HTTP. Para `listProducts` usar `ProductReadRepository::listProducts(ProductFilters, tenant_id)` y caché si aporta valor.

**Riesgos:** autorización en entrada y consulta filtrada por tenant, concurrencia, doble click idempotente, evento outbox reintentable, modificación de agregado dentro de transacción.

## ✅ Correcto / ❌ Incorrecto: use-cases

- ✅ Caso de uso con verbo del negocio y ports; agregado protege `processProduct()` y transacción.
- ❌ Nombrar todos los comandos `store/update` o mover invariantes al controller.
- **Gate:** Prueba: transición inválida rechazada y cambios atómicos.

Refactor existente: [modernización segura](../../../../standards/engineering/refactoring-existing-code.md).
