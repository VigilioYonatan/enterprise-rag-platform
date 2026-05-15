<?php
declare(strict_types=1);
namespace Vigilio\Reference\Infrastructure;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Redis;
use Vigilio\Reference\Application\{ProductCache,ProductPage};

final class RedisProductCache implements ProductCache
{
    private function versionKey(int $tenantId): string
    {
        return "tenant:{$tenantId}:products:list_version";
    }

    public function listVersion(int $tenantId): int
    {
        return (int) (Redis::get($this->versionKey($tenantId)) ?: 0);
    }

    public function getPage(string $key): ?ProductPage
    {
        $page = Cache::store('redis')->get($key);
        return $page instanceof ProductPage ? $page : null;
    }

    public function putPage(string $key, ProductPage $page, int $ttlSeconds): void
    {
        Cache::store('redis')->put($key, $page, $ttlSeconds);
    }

    public function invalidateAfterCommit(int $tenantId, int $productId): void
    {
        // Counter must not expire/evict; configure Redis namespace eviction policy.
        Redis::incr($this->versionKey($tenantId));
        Cache::store('redis')->forget("tenant:{$tenantId}:product:{$productId}");
    }
}
