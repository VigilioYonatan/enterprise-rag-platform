# Laravel: OpenAPI canónico + Scalar

**Autoridad contractual:** esquema Zod del paquete compartido TS -> documento `openapi.json` versionado -> backend Laravel implementa ese JSON, frontend reusa `z.infer`, Scalar renderiza. Nunca mantener un Swagger PHP adicional con tipos divergentes.

**Separación de responsabilidades:** el contrato fuente TypeScript se desarrolla únicamente en el paquete de contratos y se publica como OpenAPI. **Laravel no compila Zod** ni mantiene una segunda versión TypeScript del DTO en sus guías: el controller/Resource PHP proyecta solo los campos que el OpenAPI autoriza y las pruebas de contrato detectan drift.

Consulta el [contrato fuente tipado con Zod](../../nestjs/http/dtos-zod.md) para el ejemplo de generación. Laravel implementa solo el JSON OpenAPI exportado; no ejecuta código TypeScript.

Instalación opcional tras comprobar Composer:

```bash
composer require scalar/laravel
php artisan scalar:install
```

En `config/scalar.php`, apuntar `file` a `base_path('contracts/openapi.json')` **si la configuración del paquete instalado lo admite**. El archivo debe existir en build; CI valida su integridad. La ruta de Scalar depende del paquete/config: comprobar `php artisan route:list`, proteger docs privadas con middleware/entorno.

Declarar y comparar por contrato `operationId: listProducts`, query params, `200`, `401`, `403`, `404`, `422`, `429`, schemas de error, ejemplos y seguridad bearer/cookie según arquitectura. Los tests HTTP comparan JSON real y OpenAPI; sin runtime parse Zod redundante obligatorio. La documentación de Scalar **no implementa autenticación** por sí sola.

Fuentes oficiales: [Scalar Laravel](https://github.com/scalar/scalar/tree/main/integrations/laravel), [Scalar Packagist](https://packagist.org/packages/scalar/laravel).

## ✅ Correcto / ❌ Incorrecto: openapi-scalar

- ✅ Generar/spec versionado único y comprobar `operationId`, query, auth y Responses mediante diff en CI.
- ❌ Escribir contratos PHP paralelos que divergen de Zod/OpenAPI o suponer que Scalar valida la implementación.
- **Gate:** Prueba: rutas Laravel y JSON reales conformes al OpenAPI publicado; docs protegidas en producción.

Refactor existente: [modernización segura](../../../../standards/engineering/refactoring-existing-code.md).

## Flujo completo sin duplicar contratos

1. El paquete de contratos TypeScript **propietario** define `productSchema` y el schema de listado por `.pick()` más paginador genérico; ese proyecto exporta OpenAPI como artefacto versionado.
2. El consumidor Laravel incluye un `contracts/openapi.json` generado, con hash de origen y operación estable `listProducts`. **No** genera un segundo schema normativo en PHP.
3. El controller Laravel aplica `FormRequest`/Policy, llama al use case semántico y compone el JSON de salida mediante Resource/presenter. En tests se verifica que el JSON cumple el mismo OpenAPI.
4. Scalar muestra el archivo aprobado y se publica con acceso controlado según el entorno. Una interfaz de documentación no sustituye ni la autenticación ni las Policies.

```php
<?php
// Controller ilustrativo: ListProducts devuelve un ProductPage tipado.
public function listProducts(
    ListProductsRequest $request,
    ListProducts $useCase,
): JsonResponse {
    $page = $useCase->listProducts($request->filters());

    return response()->json([
        'count' => $page->total,
        'next' => $page->next,
        'previous' => $page->previous,
        'results' => ProductListItemResource::collection(
            collect($page->items),
        )->resolve($request),
    ]);
}
```

El envelope (`count`, `next`, `previous`, `results`) es **ilustrativo**: si el schema canónico incluye `success` u otros campos, deben agregarse exactamente; jamás cambiar contratos públicos para adaptar un ejemplo.

### Gates de CI para el contrato

- Exportar el OpenAPI con la misma revisión de contracts que usa el frontend y guardar SHA-256/provenance.
- Comprobar que `GET /products` tiene `operationId`, filtros, paginación, seguridad, casos de error y códigos HTTP definidos en la especificación.
- Ejecutar una prueba `getJson` autenticada y una no autorizada (`401`/`403`); validar el JSON real mediante una herramienta de contract testing compatible con OpenAPI, **en CI**, no haciendo `.parse()` en cada response frontend.
- Detectar modificaciones breaking mediante OpenAPI diff y bloquear la publicación si faltan migraciones de consumidores.
- Comprobar con `route:list` la URL efectiva de Scalar y bloquear su exposición pública si contiene información privada.

✅ Correcto: una única autoridad de contrato, respuesta proyectada explícitamente, conformance tests y Scalar como visor.

❌ Incorrecto: dos schemas independientes Zod/PHP mantenidos a mano, `response()->json($model->toArray())` indiscriminado, o asumir que Scalar valida los endpoints.
