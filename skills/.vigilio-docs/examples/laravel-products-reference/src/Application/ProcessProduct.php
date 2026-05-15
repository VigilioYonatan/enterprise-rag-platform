<?php
declare(strict_types=1);
namespace Vigilio\Reference\Application;

use Illuminate\Support\Facades\DB;
use Vigilio\Reference\Domain\Product;

final readonly class ProcessProduct
{
    public function __construct(private ProductWriteRepository $repository) {}

    /** Ejecuta cambio y commit; publicación/inval. fiable ocurre fuera de esta función. */
    public function processProduct(int $id, int $tenantId): Product
    {
        return DB::transaction(function () use ($id, $tenantId): Product {
            $product = $this->repository->findForUpdate($id, $tenantId);
            if ($product === null) {
                throw new \DomainException('Product not found');
            }
            $product->processProduct();
            $this->repository->save($product, $tenantId);
            return $product;
        }, attempts: 3);
    }
}
