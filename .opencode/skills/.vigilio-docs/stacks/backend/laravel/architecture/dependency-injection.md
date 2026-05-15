# Laravel: Service Container y Ports

El controller inyecta `ListProducts`, la aplicación depende de `ProductReadRepository`, infraestructura registra adapter. No introducir un container propio.

```php
<?php
// Infrastructure/Providers/ProductServiceProvider.php

declare(strict_types=1);
namespace App\Modules\Products\Infrastructure\Providers;

use Illuminate\Support\ServiceProvider;
use App\Modules\Products\Application\Ports\ProductReadRepository;
use App\Modules\Products\Application\Ports\ProductWriteRepository;
use App\Modules\Products\Infrastructure\Persistence\EloquentProductReadRepository;
use App\Modules\Products\Infrastructure\Persistence\EloquentProductWriteRepository;

final class ProductServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->bind(ProductReadRepository::class, EloquentProductReadRepository::class);
        $this->app->bind(ProductWriteRepository::class, EloquentProductWriteRepository::class);
    }
}
```

Registrar provider siguiendo bootstrap/config del proyecto Laravel 13, no asumir auto-registro de módulos externos. Vincular también `ProductCache` sólo cuando se implemente. Tests deben sustituir el port en el container y verificar la separación. Un port sin más de una implementación sigue siendo válido si protege dominio/testabilidad; evitar puertos ceremoniales en CRUD trivial.

## ✅ Correcto / ❌ Incorrecto: revisión 2026

- ✅ **Correcto:** Mantener invariantes en el agregado cuando existan; nombre semántico y ports desacoplados de framework/ORM.
- ❌ **Incorrecto:** DDD ceremonial para CRUD trivial, lógica de dominio en controller, repositorio retornando mensajes HTTP del negocio sin necesidad.
- **Al recibir código existente:** primero caracterizar el comportamiento, después refactorizar en pasos comprobables. [Guía canónica de modernización](../../../../standards/engineering/refactoring-existing-code.md).

## Cobertura de implementación y evidencia (ampliación)

Estas comprobaciones concretan el tema de esta guía; aplicar solo las pertinentes al sistema consumidor y documentar exclusiones justificadas.

1. **Bindings:** Declarar token/interfaz de port y mapearlo al adaptador por módulo/proveedor.
2. **Entornos:** Sustituir adaptadores por fake solo para unit test; marcar límites E2E con adaptador real.
3. **Ciclo de vida:** Evaluar singleton/request scope y riesgo de fuga de contexto tenant.
4. **Circularidad:** Evitar dependencias circulares por diseño, no solucionarlas solo con servicio global.
5. **Seguridad:** No almacenar identidad del request en singleton mutable.
6. **Test:** Cambiar implementación del puerto manteniendo contrato e invariantes.

✅ **Correcto:** conservar el flujo funcional y demostrar criterios de aceptación con tests, trazas, revisión de contratos o un plan reproducible según el riesgo.

❌ **Incorrecto:** sustituir las reglas de negocio por un resumen, copiar implementaciones de otro framework, declarar cobertura sin evidencia o presentar `NOT_RUN` como `PASS`.

**Salida mínima:** responsable del control, riesgo cubierto, evidencia verificable y estado `PASS | FAIL | NOT_RUN | BLOCKED`. Los comandos de ejemplo son ilustrativos salvo que se adjunte ejecución real.
