# Laravel: Spatie Data para Request/Response sin invadir el dominio

> **Referencia canónica actualizada:** [Spatie Data + controller semántico](semantic-spatie-contracts.md) · [DDD y puertos PHP](../architecture/typed-domain-and-ports.md). Los fragmentos anteriores conservados tienen valor de procedencia; adoptar esta guía para nuevos cambios.

**Decisión Vigilio:** `spatie/laravel-data` es la opción preferida para proyectos Laravel con contratos DTO numerosos, una vez comprobada compatibilidad del lockfile y throughput del consumidor. **No es un sustituto de Eloquent, migraciones, Form Requests cuando se requieran ni entidades DDD.** Versión y compatibilidad: [technology/versions.md](../../../../technology/versions.md); no duplicar números aquí.

## Instalación y límites

```bash
composer require spatie/laravel-data
php artisan data:cache-structures
```

La segunda orden se ejecuta al desplegar **después** de modificar Data objects y con `structure_caching.directories` apuntando a las carpetas reales; no afirma que el paquete ya esté instalado. Ejecutar `composer validate`, `composer audit --locked`, tests e integración antes de aprobarlo. [Guía oficial](https://spatie.be/docs/laravel-data/v4/installation-setup/).

## DTO de respuesta: campos allowlist, snake_case y enums de Domain

```php
<?php
// Presentation/Http/Data/ProductResponseData.php
namespace App\Products\Presentation\Http\Data;

use Spatie\LaravelData\Data;

final class ProductResponseData extends Data
{
    public function __construct(
        public string $id,
        public string $nro_poliza,
        public string $product_type,
    ) {}
}
```

El controller debe **mapear explícitamente** `Product`/read model al DTO, no devolver `ProductRecord` completo. Si el dominio usa `ProductType` enum, convertirlo mediante `$product->getType()->value` en el presenter. Un DTO/Resource repetido se reutiliza entre `getProduct()` y `registerProduct()` si el JSON es idéntico; no crear clones por operación.

## Entrada: validación explícita y aislamiento de Application

```php
<?php
// Presentation/Http/Data/RegisterProductData.php
namespace App\Products\Presentation\Http\Data;

use Spatie\LaravelData\Data;
use Spatie\LaravelData\Attributes\Validation\Max;

final class RegisterProductData extends Data
{
    public function __construct(
        #[Max(30)]
        public string $nro_poliza,
    ) {}
}
```

Ejemplo de adaptación, **no sustituto de autorización**:

```php
public function registerProduct(RegisterProductData $input): ProductResponseData
{
    // Gate/Policy antes del caso de uso, tenant de identidad autenticada.
    $product = $this->product_service->registerProduct(
        new RegisterProductInput($input->nro_poliza),
    );

    return new ProductResponseData(
        id: $product->id,
        nro_poliza: $product->nro_poliza,
        product_type: $product->getType()->value,
    );
}
```

`RegisterProductInput` es un comando/DTO PHP propio de Application. El ejemplo supone clases de negocio existentes; **no es código compilado ni define por sí solo Gate/Policy**. Antes de producción, validar que reglas PHP, tipos, transformación y OpenAPI coincidan; en Spatie, la validación automática varía según el origen de datos y la estrategia configurada. Para arrays internos no confiables, usar `validateAndCreate(...)` explícitamente si es apropiado.

## Reglas senior de decisión y verificación

| Control | ✅ Correcto | ❌ Incorrecto | Prueba |
|---|---|---|---|
| Responsabilidad | Data en frontera HTTP, Domain puro | Extender `Data` en agregado de dominio | Dependencias de Domain |
| Input | Validar, autorizar, DTO al service | `Data::from()` como autorización | Test 401/403/422 |
| Output | Allowlist, campos snake_case | Serializar toda la entidad/secretos | Contract + privacidad |
| Reutilización | Mismo Data para mismo shape público | DTO duplicado por cada verbo CRUD | Diff JSON/OpenAPI |
| Enum | PHP enum como fuente de estado | Repetir strings de estados | Static analysis y tests |
| Eloquent | Persistencia y casts aislados | Spatie Data definiendo tablas SQL | Inspección de capas |
| Rendimiento | Cachear análisis Data en deploy | Reflexión sin comprobar impacto | CPU/p95 y load test |
| Versiones | Resolver en `composer.lock` | Declarar que está instalado aquí | `composer show` real |

**Producción:** configurar `structure_caching.directories` para tus carpetas `Presentation/Http/Data`, ejecutar `php artisan data:cache-structures` al desplegar y comparar p95, memoria y contratos de respuesta con la versión previa. [Rendimiento oficial](https://spatie.be/docs/laravel-data/v4/advanced-usage/performance).

Referencia general: [contratos HTTP](../../../../standards/api/contracts.md), [SQL optimización](../../../../standards/data/sql-performance.md), [Resources nativos](api-resources.md) y [DDD](../../../../foundations/architecture/ddd.md).
