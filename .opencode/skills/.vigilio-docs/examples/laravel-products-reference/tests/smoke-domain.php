<?php
declare(strict_types=1);

require_once __DIR__.'/../src/Domain/ProductStatus.php';
require_once __DIR__.'/../src/Domain/InvalidProductState.php';
require_once __DIR__.'/../src/Domain/Product.php';

use Vigilio\Reference\Domain\{Product,ProductStatus,InvalidProductState};

$p = new Product(1, ProductStatus::Pending);
$p->processProduct();
assert($p->status() === ProductStatus::Processed, 'must transition to processed');
try {
    $p->processProduct();
    throw new \RuntimeException('Expected invalid domain transition');
} catch (InvalidProductState) {
    echo "Domain smoke PASS\n";
}
