# Laravel — DDD semántico, tipos PHP, enums y puertos

**Equivalencia de diseño**, no de sintaxis: PHP no soporta `Product['id']` ni `z.infer`, por lo que se utilizan tipos PHP nativos, enums y Value Objects cuando aporten invariantes. [Regla de nombres](../../../../standards/engineering/naming-and-boundaries.md), [versiones](../../../../technology/versions.md).

```php
<?php
// Domain/Enums/OrderStatus.php
namespace App\Orders\Domain\Enums;
enum OrderStatus: string {
    case Pending = 'pending';
    case Shipped = 'shipped';
    case Cancelled = 'cancelled';
}

// Domain/Order.php (archivo independiente)
final class Order {
    public function __construct(
        public readonly string $id,
        private OrderStatus $status,
    ) {}
    public function getStatus(): OrderStatus { return $this->status; }
    public function cancel(): void {
        if ($this->status === OrderStatus::Shipped) {
            throw new \DomainException('Order already shipped');
        }
        $this->status = OrderStatus::Cancelled;
    }
}
```

No definir `string $status = 'pending'` por toda la aplicación. Los estados viven en el `OrderStatus` enum con invariantes en el agregado. Los Value Objects (`ProductId`, `Money`) se justifican con invariantes reales, no solo para envolver cada string.

```php
<?php
// Application/Ports/ProductRepository.php
interface ProductRepository {
    public function findById(string $product_id, string $tenant_id): ?Product;
    public function findByCriteria(ProductCriteria $criteria): array;
    public function save(Product $product): void;
}

// Application/Services/ProductService.php
final readonly class ProductService {
    public function __construct(private ProductRepository $product_repository) {}
    public function getProduct(string $product_id, string $tenant_id): Product {
        return $this->product_repository->findById($product_id, $tenant_id)
            ?? throw new ProductNotFoundException();
    }
}
```

`Product`, `ProductCriteria` y `ProductNotFoundException` son tipos del consumidor, **no implementaciones dentro de este Markdown**. Para producción, repositorio con consulta tenant-scoped, DB transacción sobre cambios de estado, concurrencia e idempotencia, y autorización al controller/Policy.

✅ **Correcto:** `$product_id` `snake_case`, `getProduct()` `camelCase`, `OrderStatus` `PascalCase`, repo `findById()/save()`, ORM aislado en infraestructura.

❌ **Incorrecto:** `update()` como nombre de aprobar/cancelar, SQL/Eloquent en Domain, violar tenant con `find($id)` sin filtro, duplicar estados con strings mágicas, usar Spatie Data como entidad de dominio.

**Pruebas:** `Order::cancel` contra estados, tipado PHPStan, filtro tenant Eloquent real, repo `findById` not found, autorización 401/403/404 y race condition. **Estado:** `NOT_RUN`.
