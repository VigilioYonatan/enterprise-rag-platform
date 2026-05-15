# Laravel: estructura modular, DDD pragmático y responsabilidades

Para funcionalidades con invariantes reales, encapsular por bounded context. No exigir todas las carpetas para un CRUD simple.

```text
app/Modules/Products/
  Domain/
    Entities/Product.php                 # identidad + invariantes
    Enums/ProductStatus.php
    Constants/ProductRules.php
    Types/ProductAuditContext.php
    Exceptions/InvalidProductState.php
  Application/
    UseCases/ListProducts.php
    UseCases/ProcessProduct.php
    DTOs/ProductFilters.php
    DTOs/ProductListItem.php
    DTOs/ProductPage.php
    Ports/ProductReadRepository.php
    Ports/ProductWriteRepository.php
    Ports/ProductCache.php
  Infrastructure/
    Http/Controllers/ProductController.php
    Http/Requests/ListProductsRequest.php
    Http/Resources/ProductListItemResource.php
    Persistence/ProductRecord.php
    Persistence/EloquentProductReadRepository.php
    Persistence/EloquentProductWriteRepository.php
    Cache/RedisProductCache.php
    Providers/ProductServiceProvider.php
```

## Dependencias permitidas

- `Domain` → PHP puro, enums, DateTimeImmutable, exceptions; NO `Illuminate`, Eloquent, Redis, HTTP.
- `Application` → `Domain`, DTO propios, ports PHP; usa método `processProduct`, no `update()` para reglas de estado.
- `Infrastructure` → Laravel FormRequest, JsonResponse/Resource, Eloquent, cache, DI.
- Providers vinculan interfaces a implementaciones con scopes correctos.
- `ProductRecord` de Eloquent no es `Product` del dominio. Mapear expresamente al agregado si hay invariantes; para lecturas consultar proyecciones sin materializar agregados.

**Precedencia:** reglas [DDD compartidas](../../../../foundations/architecture/ddd.md) y [SOLID](../../../../foundations/architecture/solid.md). El ejemplo histórico NestJS sigue disponible en `stacks/backend/nestjs/`.

> Fuente única para **Correcto / Incorrecto: revisión 2026**: [abrir documento canónico](../../../../governance/documentation-dry-and-ownership.md).


## Cobertura de implementación y evidencia (ampliación)

Estas comprobaciones concretan el tema de esta guía; aplicar solo las pertinentes al sistema consumidor y documentar exclusiones justificadas.

1. **Capas:** Mostrar dominio, aplicación, adaptadores y contract/DTO y prohibir imports inversos.
2. **Rutas:** Separar `const/` y `types/` cuando hay definiciones compartidas reales, sin crear carpetas vacías.
3. **Reutilización:** Enlazar a standards/foundations en vez de copiar DDD por lenguaje.
4. **Ejemplo transversal:** Rastrear Product DTO → Controller → Service → Repo → lectura hasta operación semántica.
5. **Owner:** Ubicar schema y enum en una sola fuente, evitando duplicados de valores.
6. **Gate:** Inspeccionar estructura, import boundaries y pruebas por capa.

✅ **Correcto:** conservar el flujo funcional y demostrar criterios de aceptación con tests, trazas, revisión de contratos o un plan reproducible según el riesgo.

❌ **Incorrecto:** sustituir las reglas de negocio por un resumen, copiar implementaciones de otro framework, declarar cobertura sin evidencia o presentar `NOT_RUN` como `PASS`.

**Salida mínima:** responsable del control, riesgo cubierto, evidencia verificable y estado `PASS | FAIL | NOT_RUN | BLOCKED`. Los comandos de ejemplo son ilustrativos salvo que se adjunte ejecución real.
