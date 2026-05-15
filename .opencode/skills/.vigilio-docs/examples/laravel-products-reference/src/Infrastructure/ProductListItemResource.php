<?php
declare(strict_types=1);
namespace Vigilio\Reference\Infrastructure;

use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Http\Request;

final class ProductListItemResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return ['id'=>$this->resource->id, 'nro_poliza'=>$this->resource->policyNumber, 'product_type'=>$this->resource->productType];
    }
}
