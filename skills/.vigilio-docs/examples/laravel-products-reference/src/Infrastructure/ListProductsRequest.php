<?php
declare(strict_types=1);
namespace Vigilio\Reference\Infrastructure;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Vigilio\Reference\Application\ProductFilters;

final class ListProductsRequest extends FormRequest
{
    public function authorize(): bool { return $this->user()?->can('viewAny', ProductRecord::class) ?? false; }
    public function rules(): array
    {
        return [
            'limit' => ['sometimes','integer','min:1','max:100'],
            'offset' => ['sometimes','integer','min:0'],
            'estado' => ['sometimes',Rule::in(['pendiente','procesado','anulado'])],
        ];
    }
    public function filters(): ProductFilters
    {
        return new ProductFilters($this->integer('limit', 25), $this->integer('offset', 0), $this->validated('estado'));
    }
}
