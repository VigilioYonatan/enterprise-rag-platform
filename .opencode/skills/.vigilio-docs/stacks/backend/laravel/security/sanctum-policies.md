# Laravel: Sanctum, Policies y tenant isolation

Sanctum 4.x es opción para APIs token/cookie; decidir estrategia según frontend/SSO, no instalar indiscriminadamente. Controllers sólo ejecutan actions tras autorización.

```php
<?php
// ProductPolicy.php (fragmento)

public function viewAny(User $user): bool
{
    return $user->can('products.read');
}

public function process(User $user, ProductRecord $product): bool
{
    return $user->tenant_id === $product->tenant_id && $user->can('products.process');
}
```

El route model binding sin scope de tenant puede revelar existencia (enumeración); reforzar en queries, `findForUpdate($id,$tenant_id)` y policy. Protección contra IDOR, CSRF en cookie auth, expiración/revocación de tokens, rate limiting, secretos desde entorno/secret store, CORS restrictivo.

Tests feature obligatorios: anónimo (401), sin permiso (403), tenant ajeno, recurso no existente (404), éxito, token inválido y query con filtros maliciosos. Nunca registrar secretos/PII. `@ApiBearerAuth` en NestJS y declaración `security` en OpenAPI solo documentan; enforcement real en middleware/guards/policies.

## ✅ Correcto / ❌ Incorrecto: sanctum-policies

- ✅ Sanctum valida identidad, Policy autoriza recurso, Repository limita tenant en cada consulta.
- ❌ Confiar exclusivamente en route-model binding por ID o en `auth:sanctum` como autorización de negocio.
- **Gate:** Prueba: usuario de otro tenant recibe 403/404 uniforme sin fuga de existencia.

Refactor existente: [modernización segura](../../../../standards/engineering/refactoring-existing-code.md).

## Autenticación no equivale a autorización

```php
public function view(User $user, ProductRecord $product): bool
{
    return (int) $user->tenant_id === (int) $product->tenant_id
        && $user->can('products.read'); // permiso concreto existente en el sistema
}
```

Esta Policy es un **ejemplo** y presupone que el modelo `User` tenga permiso `products.read`. No aceptar un `tenant_id` enviado por HTTP como contexto confiable. Incluso con Policy, cada SQL de listado o total debe filtrar tenant/ownership.

✅ `auth:sanctum` + Policy + tenant isolation en repositorios con pruebas cruzadas; ❌ ruta pública para datos privados, confiar en UI o en ID obscuro, exponer existencia de recursos ajenos mediante errores distintos.

**Gate:** 401 para no autenticado, 403/404 consistentes para cross-tenant, pruebas de privilegios mínimos y secretos fuera de logs.

## Cobertura de implementación y evidencia (ampliación)

Estas comprobaciones concretan el tema de esta guía; aplicar solo las pertinentes al sistema consumidor y documentar exclusiones justificadas.

1. **Autenticación:** Definir uso real de cookie/CSRF o bearer y no mezclarlos implícitamente.
2. **Autorización:** Aplicar Policy al agregado y capacidad de dominio, no solo middleware.
3. **Recursos:** Ocultar datos sin permiso tanto en query como en API Resource.
4. **Revocación:** Probar sesión/token revocado y cache actualizada.
5. **Denegación:** Distinguir 401, 403 y 404 bajo política de no divulgación.
6. **Prueba:** Asegurar usuarios de múltiples tenants con propiedad y ACL cruzadas.

✅ **Correcto:** conservar el flujo funcional y demostrar criterios de aceptación con tests, trazas, revisión de contratos o un plan reproducible según el riesgo.

❌ **Incorrecto:** sustituir las reglas de negocio por un resumen, copiar implementaciones de otro framework, declarar cobertura sin evidencia o presentar `NOT_RUN` como `PASS`.

**Salida mínima:** responsable del control, riesgo cubierto, evidencia verificable y estado `PASS | FAIL | NOT_RUN | BLOCKED`. Los comandos de ejemplo son ilustrativos salvo que se adjunte ejecución real.
