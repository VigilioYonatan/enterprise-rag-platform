# Laravel: Form Request como frontera de validación

No trasladar `ZodPipe` a PHP. Laravel valida HTTP y convierte enteros solicitados con `integer()`. Una `Rule::in()` evita estados arbitrarios. El DTO de aplicación no depende del request HTTP.

```php
<?php
// Infrastructure/Http/Requests/ListProductsRequest.php

declare(strict_types=1);
namespace App\Modules\Products\Infrastructure\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use App\Modules\Products\Application\DTOs\ProductFilters;

final class ListProductsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('viewAny', \App\Modules\Products\Infrastructure\Persistence\ProductRecord::class) ?? false;
    }

    public function rules(): array
    {
        return [
            'limit' => ['sometimes', 'integer', 'min:1', 'max:100'],
            'offset' => ['sometimes', 'integer', 'min:0'],
            'estado' => ['sometimes', Rule::in(['pendiente', 'procesado', 'anulado'])],
        ];
    }

    public function filters(): ProductFilters
    {
        return new ProductFilters(
            limit: $this->integer('limit', 25),
            offset: $this->integer('offset', 0),
            status: $this->validated('estado'),
        );
    }
}
```

```php
<?php
// Application/DTOs/ProductFilters.php

declare(strict_types=1);
namespace App\Modules\Products\Application\DTOs;

final readonly class ProductFilters
{
    public function __construct(
        public int $limit,
        public int $offset,
        public ?string $status,
    ) {}
}
```

Aplicar `422` a errores de validación y `403` a política fallida. Si se necesita `limit` ausente vs. cero o más opciones, definir claramente las reglas HTTP y derivar defaults una vez; no devolver `(int) "abc"` sin validar antes. Probar `limit=10`, `limit=0`, `limit=101`, texto, floats y tenant distinto.

## ✅ Correcto / ❌ Incorrecto: form-requests

- ✅ `rules()` valida 1..100, `integer()` entrega tipos seguros al `ProductFilters` readonly.
- ❌ `$limit = (int) $request->query('limit')` sin validar; usar `FormRequest` para reglas del agregado.
- **Gate:** Prueba: valores ausentes, 0, 101, negativos, decimales, texto, payload adicional y autorización.

Refactor existente: [modernización segura](../../../../standards/engineering/refactoring-existing-code.md).
