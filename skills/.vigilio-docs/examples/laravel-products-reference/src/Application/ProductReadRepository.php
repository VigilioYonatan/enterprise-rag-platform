<?php
declare(strict_types=1);
namespace Vigilio\Reference\Application;

interface ProductReadRepository
{
    public function listProducts(ProductFilters $filters, int $tenantId): ProductPage;
}
