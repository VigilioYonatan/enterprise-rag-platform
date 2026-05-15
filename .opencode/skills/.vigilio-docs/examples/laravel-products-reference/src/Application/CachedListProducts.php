<?php
declare(strict_types=1);
namespace Vigilio\Reference\Application;

use Illuminate\Support\Facades\Log;

final readonly class CachedListProducts
{
    public function __construct(
        private ProductReadRepository $repository,
        private ProductCache $cache,
    ) {}

    public function listProducts(ProductFilters $filters, int $tenantId): ProductPage
    {
        try {
            $version = $this->cache->listVersion($tenantId);
        } catch (\Throwable $e) {
            Log::warning('products.cache.version_unavailable', ['error_type' => $e::class]);
            return $this->repository->listProducts($filters, $tenantId);
        }
        $fingerprint = hash('sha256', json_encode([
            $filters->limit, $filters->offset, $filters->status,
        ], JSON_THROW_ON_ERROR));
        $key = "tenant:{$tenantId}:products:g{$version}:{$fingerprint}";
        try {
            $existing = $this->cache->getPage($key);
            if ($existing !== null) return $existing;
        } catch (\Throwable $e) {
            Log::warning('products.cache.read_unavailable', ['error_type' => $e::class]);
        }
        $page = $this->repository->listProducts($filters, $tenantId);
        try {
            $this->cache->putPage($key, $page, 60);
        } catch (\Throwable $e) {
            Log::warning('products.cache.write_unavailable', ['error_type' => $e::class]);
        }
        return $page;
    }
}
