<?php
declare(strict_types=1);
namespace Vigilio\Reference\Application;

use Vigilio\Reference\Domain\Product;
interface ProductWriteRepository
{
    public function findForUpdate(int $id, int $tenantId): ?Product;
    public function save(Product $product, int $tenantId): void;
}
