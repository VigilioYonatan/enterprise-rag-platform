<?php
declare(strict_types=1);
namespace Vigilio\Reference\Application;

final readonly class ProductFilters
{
    public function __construct(public int $limit, public int $offset, public ?string $status) {}
}
