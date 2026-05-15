<?php
declare(strict_types=1);
namespace Vigilio\Reference\Infrastructure;

use Illuminate\Contracts\Auth\Authenticatable;

final class ProductPolicy
{
    public function viewAny(Authenticatable $actor): bool
    {
        return method_exists($actor, 'can') && $actor->can('products.read');
    }

    public function process(Authenticatable $actor, ProductRecord $product): bool
    {
        return (int) $actor->tenant_id === (int) $product->tenant_id
            && method_exists($actor, 'can') && $actor->can('products.process');
    }
}
