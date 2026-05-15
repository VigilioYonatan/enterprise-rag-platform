<?php
declare(strict_types=1);
namespace Vigilio\Reference\Application;

final readonly class ListProducts
{
    public function __construct(private ProductReadRepository $repository) {}

    public function listProducts(ProductFilters $filters, int $tenantId): ProductPage
    {
        return $this->repository->listProducts($filters, $tenantId);
    }
}
