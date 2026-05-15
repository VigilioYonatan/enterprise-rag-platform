# Laravel — Controller semántico y Spatie Data para request/response

[Contrato común](../../../../standards/api/contracts.md) · [distinción validación HTTP/datos](../../../../standards/api/http-dtos-and-contracts.md) · [DDD Laravel](../architecture/typed-domain-and-ports.md) · [Spatie Data](spatie-data.md) · [versiones](../../../../technology/versions.md). Clases de ejemplo en archivos **separados**; no mezclar Laravel con clases NestJS en el mismo tutorial.

## Request Data y autorización

```php
<?php
// Presentation/Http/Data/RegisterProductData.php
namespace App\Products\Presentation\Http\Data;
use Spatie\LaravelData\Data;
use Spatie\LaravelData\Attributes\Validation\Max;
final class RegisterProductData extends Data {
    public function __construct(#[Max(30)] public string $nro_poliza) {}
}
```

```php
<?php
// Presentation/Http/Data/ProductResponseData.php
namespace App\Products\Presentation\Http\Data;
use Spatie\LaravelData\Data;
final class ProductResponseData extends Data {
    public function __construct(
        public string $id,
        public string $nro_poliza,
        public string $product_type,
    ) {}
}
```

`ProductResponseData` es reutilizable desde `getProduct()` y `registerProduct()` cuando tienen **el mismo contrato JSON**. No inventar un Data class para operaciones sin body ni por cada sinónimo CRUD. No devolver Eloquent directamente.

## Rutas y Controller

```php
<?php
// routes/api.php
use App\Products\Presentation\Http\ProductController;
use Illuminate\Support\Facades\Route;
Route::middleware('auth:sanctum')->prefix('products')->group(function (): void {
    Route::get('{product_id}', [ProductController::class, 'getProduct'])->whereUuid('product_id');
    Route::post('', [ProductController::class, 'registerProduct']);
});
```

```php
<?php
// Presentation/Http/ProductController.php
final class ProductController extends Controller {
    public function __construct(private readonly ProductService $product_service) {}
    public function getProduct(Request $request, string $product_id): ProductResponseData {
        Gate::authorize('viewProduct'); // La policy real debe registrarse
        $product = $this->product_service->getProduct(
            $product_id, (string) $request->user()->tenant_id
        );
        return new ProductResponseData(
            id: $product->id, nro_poliza: $product->nro_poliza,
            product_type: $product->getType()->value,
        );
    }
}
```

Esto **no es ejecutable sin imports, services, autorización, tenant y entidad reales del proyecto**. `RegisterProductData` puede inyectarse como request Data y mapearse a un comando `RegisterProductInput`; no debe pasarse la dependencia HTTP hasta Domain. En cargas desde arrays internos no confiables, `validateAndCreate(...)` explícito según estrategia de validación configurada. `Gate::authorize` y tenant deben comprobarse también en consultas y no filtrarse a otra organización.

## Reutilización y límites

- `Data` admite validación y serialización, pero **no genera migraciones** ni tiene `.pick()`/`z.infer` equivalentes de Zod; cada DTO PHP declara propiedades tipadas.
- `FormRequest` sigue siendo opción válida cuando autorización/validación custom compleja lo justifican; no duplicar dos validadores por request sin motivo.
- En producción: `php artisan data:cache-structures` con directories apropiados, lockfile y profiling p95, pruebas de regresión HTTP. `composer require spatie/laravel-data` solo en consumidor aprobado.

✅ **Correcto:** rutas + acciones semánticas, `snake_case` en propiedades PHP y JSON, response reusable por shape y allowlist, dominio sin `Data`.

❌ **Incorrecto:** usar `$tenant_id` enviado por cliente para autorización, exponer registro Eloquent completo, DTOs `register-product/update/destroy`, instalar Spatie sin tests, declarar request validado por `Data::from()` en todo contexto.

**Pruebas:** 401, 403, 404 transversal, 422, JSON allowlist, compatibilidad OpenAPI, idempotencia/duplicados en registro y throughput con cached structures. **Estado:** `NOT_RUN`.


## Equivalencia exacta a la separación Zod/DTO de NestJS

| TypeScript/NestJS | PHP/Laravel | Rol |
|---|---|---|
| `domain/schemas/user.schema.ts` / `UserSchema` | `Domain/Entities/UserEntity.php` + `Domain/Enums/UserStatus.php` | Datos/invariantes del dominio; en PHP no existe `z.infer` |
| `*.request.dto.ts` | `Presentation/Http/Requests/RegisterUserRequest.php` **o** atributos/reglas de `RegisterUserData` | Validación de entrada HTTP |
| `*.request.dto.ts` | `Presentation/Http/Data/RegisterUserData.php` | Datos tipados de entrada; con Spatie la validación puede coexistir en la misma clase |
| `*.response.dto.ts` / `*.response.dto.ts` | `Presentation/Http/Data/UserResponseData.php` | Contrato de salida y allowlist |
| `infrastructure/persistence/users.table.ts` | `database/migrations/*.php` + `Infrastructure/Persistence/Models/User.php` (Eloquent) | SQL/ORM |

**No forzar la duplicación PHP** de un Request y Spatie Data con las mismas reglas: escoger una autoridad de validación por operación; `FormRequest` cuando la autorización y normalización son complejas, Spatie Data cuando los DTOs tipados agregan valor. Ninguna opción cambia el hecho de que Controller solo adapta, Application gobierna caso de uso y Domain preserva invariantes. Los nombres de métodos son semánticos, pero no renombrar APIs nativas (`rules()`, `authorize()`, `casts()`).
