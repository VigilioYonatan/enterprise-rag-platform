<?php
declare(strict_types=1);
namespace Vigilio\Reference\Infrastructure;

use Vigilio\Reference\Application\{ProductReadRepository,ProductFilters,ProductPage,ProductListItem};

final class EloquentProductReadRepository implements ProductReadRepository
{
    public function listProducts(ProductFilters $filters, int $tenantId): ProductPage
    {
        $query = ProductRecord::query()->where('tenant_id', $tenantId)
            ->when($filters->status, fn ($q, $status) => $q->where('estado', $status));
        $total = (clone $query)->count();
        $items = $query->orderBy('id')->offset($filters->offset)->limit($filters->limit)
            ->get(['id', 'nro_poliza', 'product_type'])
            ->map(fn ($row): ProductListItem => new ProductListItem(
                (int) $row->id, (string) $row->nro_poliza, (string) $row->product_type,
            ))->all();
        $next = $filters->offset + count($items);
        return new ProductPage($items, $total, $next < $total ? (string)$next : null,
            $filters->offset > 0 ? (string)max(0, $filters->offset - $filters->limit) : null);
    }
}
