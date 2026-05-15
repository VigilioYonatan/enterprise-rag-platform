<?php
declare(strict_types=1);
namespace Vigilio\Reference\Infrastructure;

use Vigilio\Reference\Application\ProductWriteRepository;
use Vigilio\Reference\Domain\{Product,ProductStatus};

final class EloquentProductWriteRepository implements ProductWriteRepository
{
    public function findForUpdate(int $id, int $tenantId): ?Product
    {
        $row = ProductRecord::query()->where('tenant_id', $tenantId)->whereKey($id)->lockForUpdate()->first();
        return $row === null ? null : new Product((int)$row->id, ProductStatus::from($row->estado));
    }

    public function save(Product $product, int $tenantId): void
    {
        $updated = ProductRecord::query()->where('tenant_id', $tenantId)
            ->whereKey($product->id)->update(['estado' => $product->status()->value]);
        if ($updated !== 1) throw new \RuntimeException('Product missing during persistence');
    }
}
