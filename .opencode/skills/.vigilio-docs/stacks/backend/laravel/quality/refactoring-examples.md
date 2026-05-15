# Refactorización PHP/Laravel — casos y errores verificables

## Antes de cambiar un archivo

- Inspeccionar versión PHP real (`php -v`), extensiones, Composer `platform`, `composer.lock`, configuración de error reporting y framework instalado. El baseline objetivo PHP 8.5/Laravel 13 es **propuesto** hasta resolver dependencias y tests reales.
- Identificar rutas, FormRequest, Policy, Application Service, Repository Port, Eloquent Model, Resources, contratos OpenAPI y jobs consumidores.
- Capturar comportamiento actual con tests HTTP/feature/contract y registrar consultas/tiempos para detectar regresiones.
- Mantener compatibilidad de API y estado persistido; las migraciones destructivas necesitan plan expand/contract y rollback.

## Validación y mass assignment

```php
<?php
// ❌ INCORRECTO: confiar en todos los campos arbitrarios de HTTP.
ProductRecord::create($request->all());

// ✅ CORRECTO: allowlist de entrada validada, reglas de negocio en Application/Domain.
$validated = $request->safe()->only(['nro_poliza', 'product_type']);
$product = $useCase->createProduct(new CreateProductData(
    nro_poliza: $validated['nro_poliza'],
    product_type: $validated['product_type'],
));
```

No copiar `ZodPipe` a PHP ni usar `JsonResource` como validador de entrada. La Policy se comprueba además de auth: `auth:sanctum` no sustituye autorización por recurso o tenant.

## Bucles, Collection y SQL

```php
<?php
// ❌ INCORRECTO: una consulta al broker por cada producto si no se precarga.
foreach (ProductRecord::all() as $product) {
    auditBrokerName($product->broker->name);
}

// ✅ CORRECTO: precargar selectivamente y procesar en lotes.
ProductRecord::query()
    ->with('broker:id,name')
    ->select(['id', 'broker_id'])
    ->chunkById(200, function ($products): void {
        foreach ($products as $product) {
            auditBrokerName($product->broker->name);
        }
    });
```

`chunkById` es útil para grandes conjuntos, pero verifica los requisitos de orden, filtros y concurrencia. `foreach` es correcto para efectos; `array_map` o `Collection::map` para producir datos; `for` con índices cuando el algoritmo lo necesita. Evita `.map()` para mutar estados. No disparar jobs ilimitados en un `foreach` sin backpressure.

## DDD y separación de tipos

- ✅ `ProcessProduct` abre una transacción, recupera agregado scoped al tenant, invoca `processProduct()` y persiste; la entidad garantiza invariantes.
- ❌ `ProductController::update` con SQL, caché y lógica de transición `pendiente → procesado` en una única clase.
- ✅ `Domain/Enums`, `Domain/Constants`, `Domain/Types` y `ValueObjects` sólo cuando expresan conceptos propios; errores y eventos separados.
- ❌ Crear `ProductStatus` tanto en cuatro clases PHP como en cada schema TypeScript; documentar traducción contra el contrato OpenAPI.

## Transacciones, caché, seguridad

- ✅ DB::transaction para escrituras coherentes y bloqueos/versionado cuando haya concurrencia; invalidar Redis **después** de commit.
- ❌ Envolver `Cache::forget()` en DB::transaction y declarar atomicidad Redis/PostgreSQL.
- ✅ `Cache::remember`/`Cache::flexible` sólo cuando se admite consistencia adecuada; se documentan stale windows y TTL; generación por tenant para listados.
- ❌ `Cache::flush()` o `Cache::forget('products:*')` para invalidar un recurso, o cache keys sin tenant/permisos.
- ✅ `Log::withContext` y OTel sin PII; eventos de dominio o de integración separados según necesidad.

## Compatibilidad, calidad y evidencia

Ejecutar según impacto: `composer validate --strict`, `composer audit --locked`, `vendor/bin/pint --test`, `vendor/bin/phpstan analyse`, `vendor/bin/pest`, PostgreSQL/Redis reales, pruebas de contrato OpenAPI y políticas tenant. Si falla dependencia, reportar `BLOCKED`/`NOT_RUN` y conservar código sin marcarlo validado.

No habilitar `Model::preventLazyLoading()` globalmente en producción sin estrategia de medición y excepciones justificadas. Considerar habilitarlo en desarrollo/test donde sirve para detectar N+1; revisar queries reales y relaciones legítimamente diferidas.

Ver también: [reglas generales existente](../../../../standards/engineering/refactoring-existing-code.md) · [iteración y colecciones](../../../../standards/engineering/collections-and-iteration.md) · [Form Requests Laravel](../http/form-requests.md).

Referencias oficiales: [Form Request validation](https://laravel.com/docs/13.x/validation), [Laravel Cache](https://laravel.com/docs/13.x/cache), [PHP foreach](https://www.php.net/manual/en/control-structures.foreach.php).

> Fuente única para **Correcto / Incorrecto: revisión 2026**: [abrir documento canónico](../../../../governance/documentation-dry-and-ownership.md).


## PHP: recorrido Eloquent, N+1 y chunkById — ejemplo trasladado sin pérdida

```php
<?php
// ❌ INCORRECTO: consulta por cada producto (N+1) si belongsTo('broker').
foreach (ProductRecord::all() as $product) {
    echo $product->broker->name;
}

// ✅ CORRECTO: cargar relación sólo cuando se necesita y paginar/chunkear.
ProductRecord::query()
    ->with('broker:id,name')
    ->select(['id', 'broker_id', 'name'])
    ->chunkById(500, function ($products): void {
        foreach ($products as $product) {
            processProduct($product);
        }
    });
```

Este código es un ejemplo de patrón, no un módulo autónomo: requiere relación `broker` y función `processProduct` existentes. No se debe usar `chunkById` sin planificar la consistencia de datos bajo escrituras concurrentes.

## Iteraciones y concurrencia específicas

- **PHP:** `foreach` es idiomático para efectos y recorrido; `array_map()` o `Collection::map()` transforman y retornan colección; `Collection::each()` para efectos cuando es realmente legible; `for` indexado es válido para un algoritmo que requiere posiciones.

## Colecciones PHP: casos exactos conservados

```php
<?php
// ✅ Transformación de valores a DTOs (PHP puro):
$ids = array_map(static fn (Product $p): int => $p->id, $products);

// ✅ Efecto secuencial (PHP):
foreach ($products as $product) {
    $processor->processProduct($product);
}

// ✅ Con Collection de Laravel cuando se desea otra colección:
$ids = $productsCollection->map(fn ($p) => $p->id);

// ❌ collection->map() cuando sólo interesa ejecutar un side effect:
$productsCollection->map(fn ($p) => Log::info('product', ['id' => $p->id]));
```

No usar `foreach (&$value)` sin `unset($value)` al terminar si la referencia se conserva: PHP mantiene una referencia al último elemento. En procesamiento masivo, instrumentar queries y memoria; la sintaxis del loop suele importar menos que N+1 o cardinalidad.
