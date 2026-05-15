<?php
declare(strict_types=1);
namespace Vigilio\Reference\Application;

final readonly class ProductListItem
{
    public function __construct(public int $id, public string $policyNumber, public string $productType) {}
}
