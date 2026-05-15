# Controllers Laravel 13: adaptadores HTTP delgados

**Métodos semánticos:** `listProducts`, `processProduct`, `approvePolicy`, `cancelOrder`; no forzar `index/store/update` para comandos de negocio. `GET /products` puede ser una query, no un aggregate.

```php
<?php
// Infrastructure/Http/Controllers/ProductController.php

declare(strict_types=1);
namespace App\Modules\Products\Infrastructure\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Gate;
use App\Modules\Products\Application\UseCases\ListProducts;
use App\Modules\Products\Application\UseCases\ProcessProduct;
use App\Modules\Products\Infrastructure\Http\Requests\ListProductsRequest;
use App\Modules\Products\Infrastructure\Http\Resources\ProductListItemResource;
use App\Modules\Products\Infrastructure\Persistence\ProductRecord;

final class ProductController extends Controller
{
    public function listProducts(ListProductsRequest $request, ListProducts $useCase): JsonResponse
    {
        $page = $useCase->listProducts($request->filters(), (int) $request->user()->tenant_id);

        return response()->json([
            'success' => true,
            'count' => $page->total,
            'next' => $page->next,
            'previous' => $page->previous,
            'results' => array_map(
                fn ($item) => (new ProductListItemResource($item))->resolve($request),
                $page->items,
            ),
        ]);
    }

    public function processProduct(ProductRecord $product, ProcessProduct $useCase): JsonResponse
    {
        Gate::authorize('process', $product);
        $actor = request()->user();
        $result = $useCase->processProduct((int) $product->id, (int) $actor->tenant_id);

        return response()->json(['success' => true, 'result' => [
            'id' => $result->id, 'estado' => $result->status->value,
        ]]);
    }
}
```

Rutas protegidas, sin docs abiertas en producción salvo policy:

```php
Route::middleware('auth:sanctum')->prefix('products')->group(function () {
    Route::get('/', [ProductController::class, 'listProducts'])->name('products.list');
    Route::post('/{product}/process', [ProductController::class, 'processProduct'])->name('products.process');
});
```

Los imports `Route` y controller se configuran en `routes/api.php`; usar `ProductPolicy` para listados en `FormRequest` y para entidad individual con `Gate`. **Crítico:** route model binding solo por `id` no garantiza tenant: scopearlo, negar objeto ajeno y reforzarlo en repository. Respuestas JSON deben cumplir [OpenAPI canónico](openapi-scalar.md).

## ✅ Correcto / ❌ Incorrecto: controllers

- ✅ Controllers limitados a HTTP, policy y presenters; llamada semántica `listProducts()`/`processProduct()` sin SQL.
- ❌ `$request->all()` directo a `ProductRecord::create()`, consultas Eloquent dentro del controller o saltar `Gate`.
- **Gate:** Prueba: 401, 403, 200, aislamiento de tenant y que Resource no exponga campos no autorizados.

Refactor existente: [modernización segura](../../../../standards/engineering/refactoring-existing-code.md).

## Mejoras técnicas verificables — 2026

**15. Controller PHP fino.** ✅ `listProducts(ListProductsRequest $request, ListProducts $useCase)` delega; `Policy` autoriza y `JsonResource` serializa allowlist. ❌ `ProductRecord::create($request->all())`, SQL y transiciones DDD dentro del controller.

## Referencia normativa transversal — endpoints y comentarios (2026-10-25)

- **Contrato REST**, métodos GET/POST/PUT/PATCH/DELETE, recursos, filtros, paginación, errores, authZ por objeto/tenant, concurrencia, idempotencia, jobs, auditoría y quality gates: [Diseño Senior/Staff](../../../../standards/api/rest-endpoint-design.md).
- **Comentarios locales, JSDoc/TSDoc, PHPDoc y TODO/FIXME**: [Comentarios y docstrings](../../../../standards/engineering/code-comments-and-docstrings.md). No copiar OpenAPI entero a un controller ni comentar operaciones triviales.
- Mantener los ejemplos de este stack y los contratos legacy existentes; aplicar la norma a cambios aprobados y probar compatibilidad.
