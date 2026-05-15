# Laravel: errores de transporte vs. dominio

Dominio lanza excepción tipada, por ejemplo `InvalidProductState`, sin importar `HttpException` o `JsonResponse`. El adaptador Laravel mapea: entrada inválida `422`, no autenticado `401`, forbidden `403`, no encontrado `404`, estado incompatible `409`, fallo inesperado `500` con `trace_id` y sin datos internos.

```php
// bootstrap/app.php (fragmento en withExceptions):
$exceptions->render(function (InvalidProductState $e, Request $request) {
    return response()->json([
        'error' => ['code' => 'PRODUCT_STATE_CONFLICT', 'message' => 'Estado no permite operación'],
    ], 409);
});
```

No filtrar SQL, stack trace, tokens ni PII. Compatibilidad de errores es parte del OpenAPI canónico. Pruebas deben cubrir 401, 403, 404, 409 y 422. Configurar reporte/exception tracking central sin duplicar registros entre handler y controller.

## ✅ Correcto / ❌ Incorrecto: errors

- ✅ Mapear excepción de dominio conocida a HTTP 409/422 según contrato, con `request_id` sin secretos.
- ❌ `catch (Throwable) { return response()->json(['error' => $e->getMessage()], 500); }` exponiendo stack o SQL.
- **Gate:** Prueba: errores de validación, auth y dominio conservan códigos contratados en OpenAPI.

Refactor existente: [modernización segura](../../../../standards/engineering/refactoring-existing-code.md).

## Adaptación de errores: excepciones del dominio ≠ HTTP

El dominio define errores expresivos (`InvalidProductState`, `PolicyAlreadyApproved`); el borde HTTP los convierte en códigos documentados, sin importar `JsonResponse` ni `ValidationException` dentro del agregado. `FormRequest` valida entradas y las Policies autorizan; el application service no devuelve errores HTTP.

```php
<?php
// Fragmento de registro en el manejador HTTP del consumidor.
// No introducir tipos HTTP en Domain/Product.php.
$exceptions->render(function (InvalidProductState $error, Request $request) {
    if (!$request->is('api/*')) {
        return null; // delegar a manejo web por defecto
    }
    return response()->json([
        'code' => 'PRODUCT_INVALID_STATE',
        'message' => 'La operación no está permitida en el estado actual.',
    ], 409);
});
```

En Laravel moderno este callback se registra en la configuración de excepciones adecuada del `bootstrap/app.php` del **consumidor**; verificar firma y versión contra el baseline real. El mensaje público es estable y no incluye SQL, rutas internas ni PII.

| Caso | Código esperado | Evidencia |
| --- | --- | --- |
| Request inválido | `422` | Campos inválidos sin valores sensibles |
| No autenticado | `401` | No se ejecuta el use case |
| Sin permisos | `403` | Policy aplicada por recurso |
| Estado de dominio incompatible | `409` | Invariante conservada |
| Error interno | `500` | ID de correlación, sin stacktrace público |

✅ Correcto: `code` estable por contrato y excepciones de dominio independientes.

❌ Incorrecto: capturar `Throwable` y responder `200` con `{success:false}` para errores reales.
