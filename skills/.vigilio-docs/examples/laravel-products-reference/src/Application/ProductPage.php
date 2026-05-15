<?php
declare(strict_types=1);
namespace Vigilio\Reference\Application;

final readonly class ProductPage
{
    /** @param list<ProductListItem> $items */
    public function __construct(public array $items, public int $total, public ?string $next, public ?string $previous) {}
}
