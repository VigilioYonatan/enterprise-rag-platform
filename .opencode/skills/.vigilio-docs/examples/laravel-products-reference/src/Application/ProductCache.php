<?php
declare(strict_types=1);
namespace Vigilio\Reference\Application;

interface ProductCache
{
    public function listVersion(int $tenantId): int;
    public function getPage(string $key): ?ProductPage;
    public function putPage(string $key, ProductPage $page, int $ttlSeconds): void;
    public function invalidateAfterCommit(int $tenantId, int $productId): void;
}
