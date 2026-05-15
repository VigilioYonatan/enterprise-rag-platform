# AuthN/AuthZ y Seguridad Runtime - `bus-impl` 2026

Este documento cierra la seguridad de runtime. DevSecOps protege la cadena de entrega; AuthN/AuthZ protege el negocio en ejecucion.

Regla madre:

- backend `private-by-default`
- `@Public()` solo para rutas explicitamente anonimas
- autorizacion validada en backend, no confiada al frontend

---

## 1. Modelo recomendado

Usar una mezcla pragmatica:

- **RBAC** para roles estables: `admin`, `operador`, `auditor`, `soporte`
- **ABAC** para atributos: `tenant_id`, `broker_id`, `canal`, `estado`, `ownership`
- **scopes** para integraciones machine-to-machine

Ejemplo:

```text
role=operador
tenant_id=rimac
permissions=product:create,product:read
constraints=broker_id in user.broker_ids
```

---

## 2. Matriz de permisos obligatoria

Cada controller debe tener una matriz como esta:

| Endpoint | Auth | Permiso | Restriccion |
|---|---|---|---|
| `POST /products` | privada | `product:create` | `broker_id` permitido |
| `GET /products` | privada | `product:read` | filtra por `tenant_id` |
| `GET /health` | publica | ninguno | sin datos sensibles |
| `GET /reference` | protegida | `docs:read` | solo lower envs o VPN |

Regla:

- si un endpoint no aparece en matriz de permisos, no esta listo para merge

---

## 3. `@Public`

Casos permitidos:

- `login`
- `register` si aplica
- `forgot-password`
- `health`
- `ready`
- docs solo si el entorno y la politica lo permiten

Prohibido:

- poner `@Public()` por comodidad
- endpoints internos publicos
- listados publicos con datos de negocio

Regla:

- `@Public()` debe ser metadata leida por un guard global real

---

## 4. Guards y policies

Pipeline recomendado:

```text
Request -> AuthGuard -> PermissionGuard -> TenantGuard -> Controller -> Application
```

Reglas:

- `AuthGuard` valida identidad
- `PermissionGuard` valida accion
- `TenantGuard` valida aislamiento de datos
- `application/` revalida invariantes de negocio

No hacer:

- meter reglas de permisos en Drizzle sueltas
- confiar solo en filtros del frontend
- usar solo decoradores sin tests de policy

---

## 5. Tests de autorizacion

Minimo:

- usuario sin token -> `401`
- usuario sin permiso -> `403`
- usuario con permiso pero otro tenant -> `403`
- usuario con permiso y tenant correcto -> `2xx`

Regla:

- cada endpoint critico debe tener test de `401`, `403` y happy path

---

## 6. Auditoria

Auditar:

- login
- cambio de permisos
- cambios de estado de product
- exportaciones
- accesos administrativos
- operaciones fallidas por autorizacion

Campos:

- `event_name`
- `actor_user_id`
- `tenant_id`
- `resource_type`
- `resource_id`
- `decision`
- `reason`
- `request_id`
- `correlation_id`

Regla:

- auditoria no es log comun; debe tener retencion y proteccion propia

---

## 7. Rate limiting y abuse protection

Aplicar segun criticidad:

- API Gateway throttling
- WAF si usas REST API o CloudFront
- counters en Valkey para endpoints sensibles
- limites por `tenant_id`, `user_id` o cliente

Regla:

- login, password reset, exportaciones y endpoints costosos deben tener proteccion explicita

## ✅ Correcto / ❌ Incorrecto: revisión 2026

- ✅ **Correcto:** AuthN + AuthZ de recurso/tenant; allowlist de salida, secretos fuera de logs y pruebas de acceso cruzado.
- ❌ **Incorrecto:** Permitir rutas públicas por comodidad, confiar sólo en `auth` o construir salida con `$request->all()`.
- **Al recibir código existente:** primero caracterizar el comportamiento, después refactorizar en pasos comprobables. [Guía canónica de modernización](../../../../../standards/engineering/refactoring-existing-code.md).

> **Referencia histórica completa, migrada sin recortes de contenido técnico.** La norma vigente corresponde a `foundations/` y `standards/`; las especializaciones NestJS están en `stacks/backend/nestjs/`. Ante contradicciones, seguir documentación canónica y pruebas del proyecto. Los enlaces relativos se actualizaron para mantener la navegación.

✅ **Correcto:** aplicar la normativa compartida y adaptar estos ejemplos tras comprobar versiones.

❌ **Incorrecto:** copiar ciegamente un fragmento histórico o imponer reglas de NestJS a Laravel.
