# Laravel: API Resources y proyecciones sin contratos duplicados

En NestJS el contrato público proviene de `productSchema.pick()` y `createPaginatorDto()`. El mismo OpenAPI gobierna Laravel; una Resource **implementa** proyección JSON, no crea otro contrato normativo. TypeScript estático del frontend reutiliza el tipo, sin `.parse()` obligatorio por respuesta.

```php
<?php
// Infrastructure/Http/Resources/ProductListItemResource.php

declare(strict_types=1);
namespace App\Modules\Products\Infrastructure\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

final class ProductListItemResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->resource->id,
            'nro_poliza' => $this->resource->policyNumber,
            'product_type' => $this->resource->product_type,
        ];
    }
}
```

Las propiedades provienen de `ProductListItem` (DTO/ReadModel). Si el resource recibe Eloquent directo, garantizar `select` explícito y nunca emitir `toArray()` sin allowlist para campos confidenciales. No devolver `ProductRecord` con campos internos accidentalmente.

Paginador público en el controller/presenter: `success`, `count` (total filtrado según contrato), `next`, `previous`, `results`. Un DTO PHP tipado del resultado no duplica schema Zod: se prueba conformidad con OpenAPI.

## ✅ Correcto / ❌ Incorrecto: api-resources

- ✅ Resource con lista positiva de campos autorizados y formato ISO de fechas.
- ❌ `return $model->toArray()` si hay columnas privadas o relaciones no autorizadas.
- **Gate:** Prueba: respuesta solo contiene campos públicos y coincide con contrato OpenAPI.

Refactor existente: [modernización segura](../../../../standards/engineering/refactoring-existing-code.md).

## Cobertura de implementación y evidencia (ampliación)

Estas comprobaciones concretan el tema de esta guía; aplicar solo las pertinentes al sistema consumidor y documentar exclusiones justificadas.

1. **Allowlist:** Seleccionar campos de salida permitidos y evitar pasar `Model::toArray()` directamente.
2. **Paginación:** Controlar count, next, previous y results con estructura estable.
3. **Datos opcionales:** Distinguir absent/null y fechas ISO; documentar cambios incompatibles.
4. **Relaciones:** Evitar N+1 y lazy loading accidental al serializar collections.
5. **Privacidad:** Testear ausencia de PII y metadatos internos en JSON.
6. **Contrato:** Comparar Resource real con OpenAPI y requests de consumidor.

✅ **Correcto:** conservar el flujo funcional y demostrar criterios de aceptación con tests, trazas, revisión de contratos o un plan reproducible según el riesgo.

❌ **Incorrecto:** sustituir las reglas de negocio por un resumen, copiar implementaciones de otro framework, declarar cobertura sin evidencia o presentar `NOT_RUN` como `PASS`.

**Salida mínima:** responsable del control, riesgo cubierto, evidencia verificable y estado `PASS | FAIL | NOT_RUN | BLOCKED`. Los comandos de ejemplo son ilustrativos salvo que se adjunte ejecución real.

## Alternativa verificada: Spatie Laravel Data

Consultar [Spatie Data](spatie-data.md) cuando un proyecto tenga numerosos DTOs tipados y transformaciones. Es opcional para un proyecto Laravel pequeño: no sustituye las invariantes DDD, Eloquent, controles de autorización o contratos OpenAPI. ✅ Reutilizar el mismo contrato si la respuesta es idéntica. ❌ Crear DTOs duplicados por verbo CRUD.
