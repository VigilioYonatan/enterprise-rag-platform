<?php
declare(strict_types=1);
namespace Vigilio\Reference\Domain;

final class Product
{
    public function __construct(public readonly int $id, private ProductStatus $status) {}

    public function processProduct(): void
    {
        if ($this->status !== ProductStatus::Pending) {
            throw new InvalidProductState('Only pending products may be processed');
        }
        $this->status = ProductStatus::Processed;
    }

    public function status(): ProductStatus { return $this->status; }
}
