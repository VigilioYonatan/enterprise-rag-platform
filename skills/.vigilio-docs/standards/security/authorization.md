# Autenticación, autorización y aislamiento

**Privado por defecto**. Autenticación identifica actor; autorización comprueba capacidad y propiedad del recurso. `@ApiBearerAuth()` o una etiqueta OpenAPI solo documentan, no sustituyen guards/Policies.

- NestJS: guards, policies, tenant/ownership y excepciones del dominio traducidas a HTTP.
- Laravel: `auth:sanctum` cuando proceda, Policies/Gates por recurso; devolver 401/403/404 según amenaza de enumeración y criterio publicado.
- En DB reforzar `tenant_id` y scopes en TODAS las queries; jamás confiar únicamente en un filtro del frontend o route-model-binding no acotado.
- No poner JWT/PII/password/secret ni en logs ni en claves Redis. Probar acceso cruzado entre tenants y objetos.
- Limitar tasas, tamaño de payload y exposición del OpenAPI; aplicar matriz de permisos y threat model.

[Laravel Security](../../stacks/backend/laravel/security/sanctum-policies.md) · [NestJS Auth](../../stacks/backend/nestjs/security/references/12-authz-security.md).

## ✅ Correcto / ❌ Incorrecto: revisión 2026

- ✅ **Correcto:** AuthN + AuthZ de recurso/tenant; allowlist de salida, secretos fuera de logs y pruebas de acceso cruzado.
- ❌ **Incorrecto:** Permitir rutas públicas por comodidad, confiar sólo en `auth` o construir salida con `$request->all()`.
- **Al recibir código existente:** primero caracterizar el comportamiento, después refactorizar en pasos comprobables. [Guía canónica de modernización](../engineering/refactoring-existing-code.md).

## Matriz de autorización verificable

| Caso | Resultado esperado |
|---|---|
| Sin token cuando se requiere | 401 |
| Token válido sin permiso | 403 |
| Recurso de otro tenant | denegar (403/404 según política explícita) |
| Recurso permitido del mismo tenant | ejecutar caso de uso |
| Route binding por ID sin tenant | rechazar/reforzar scope en repositorio |

**Laravel:** `auth:sanctum` autentica; Policies/Gates autorizan. `FormRequest::authorize()` comprueba permiso de lectura del conjunto cuando procede. `ProductRecord::where('tenant_id', $tenantId)` protege queries.

**NestJS:** guard de autenticación, policy guard/permisos y puerto DB filtrado por tenant. `@ApiBearerAuth()` sólo documenta el esquema; no protege la ruta.

✅ Tests por rol/tenant y proyección allowlist de respuesta. ❌ `@Public()` sin decisión/justificación o confiar en `request.user` como si fuera autorización.

## Cobertura de implementación y evidencia (ampliación)

Estas comprobaciones concretan el tema de esta guía; aplicar solo las pertinentes al sistema consumidor y documentar exclusiones justificadas.

1. **Control por objeto:** Comprobar autorización no solo por endpoint sino por recurso y acción semántica.
2. **Segregación:** Incluir tenant, usuario y ACL por documento; probar mismo ID bajo permisos distintos.
3. **Revocación efectiva:** Invalidar sesiones y caches tras cambio de permisos; prueba de lectura después de revocar.
4. **Secreto en reposo y tránsito:** Definir quién puede leer, rotar y auditar claves; verificar que logs no contienen valores.
5. **Fail closed:** Timeout, error de policy o servicio ausente deben cerrar acceso según política explícita.

✅ **Correcto:** conservar el flujo funcional y demostrar criterios de aceptación con tests, trazas, revisión de contratos o un plan reproducible según el riesgo.

❌ **Incorrecto:** sustituir las reglas de negocio por un resumen, copiar implementaciones de otro framework, declarar cobertura sin evidencia o presentar `NOT_RUN` como `PASS`.

**Salida mínima:** responsable del control, riesgo cubierto, evidencia verificable y estado `PASS | FAIL | NOT_RUN | BLOCKED`. Los comandos de ejemplo son ilustrativos salvo que se adjunte ejecución real.

## Cobertura completa y navegación por escenario

- [Matriz aplicable de prácticas, riesgos y aceptación](authorization-verification-matrix.md) — seleccionar todas las pertinentes; una guía breve o un índice no equivalen a una implementación terminada.

✅ Correcto: seguir el estándar y registrar evidencia. ❌ Incorrecto: detenerse en los primeros tres ejemplos.
