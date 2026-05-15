<?php
declare(strict_types=1);
namespace Vigilio\Reference\Infrastructure;

use Illuminate\Support\ServiceProvider;
use Vigilio\Reference\Application\{ProductReadRepository,ProductWriteRepository,ProductCache};

final class ProductServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->bind(ProductReadRepository::class, EloquentProductReadRepository::class);
        $this->app->bind(ProductWriteRepository::class, EloquentProductWriteRepository::class);
        $this->app->bind(ProductCache::class, RedisProductCache::class);
    }
}
