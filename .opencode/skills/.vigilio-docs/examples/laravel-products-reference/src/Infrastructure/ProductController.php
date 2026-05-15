<?php
declare(strict_types=1);
namespace Vigilio\Reference\Infrastructure;

use Illuminate\Routing\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Gate;
use Vigilio\Reference\Application\{ListProducts,ProcessProduct};

final class ProductController extends Controller
{
    public function listProducts(ListProductsRequest $request, ListProducts $useCase): JsonResponse
    {
        $page = $useCase->listProducts($request->filters(), (int)$request->user()->tenant_id);
        $items = array_map(fn($item) => (new ProductListItemResource($item))->resolve($request), $page->items);
        return response()->json(['success'=>true,'count'=>$page->total,
            'next'=>$page->next,'previous'=>$page->previous,'results'=>$items]);
    }

    public function processProduct(ProductRecord $product, ProcessProduct $useCase): JsonResponse
    {
        Gate::authorize('process', $product);
        $result = $useCase->processProduct((int)$product->id, (int)request()->user()->tenant_id);
        return response()->json(['success'=>true,'result'=>[
            'id'=>$result->id,'estado'=>$result->status()->value,
        ]]);
    }
}
