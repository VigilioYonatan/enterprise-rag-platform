# Aislamiento multitenant y autorización por objeto

## Invariantes

Tenant y permisos por documento/recurso deben verificarse en **todas** las consultas, escrituras, invalidaciones de caché y workers. No confiar en `tenantId` enviado por cliente: obtener identidad del contexto autorizado. Para servicios con RLS, establecer el contexto por transacción y probar bypass/roles privilegiados.

✅ Correcto: `WHERE tenant_id = authorizedTenant AND resource_id = id`, `Policy.canRead(user, resource)` y clave de caché que incorpora tenant, alcance de acceso y filtros.

❌ Incorrecto: `findById(id)` que ignora tenant; cache keys globales; autorizar en el controller pero no en colas o procesos en segundo plano.

## Pruebas negativas

- Usuario A no puede leer, modificar ni inferir identificadores de tenant B.
- Una llamada B no obtiene datos previamente cacheados por A.
- Cambiar de rol invalida/marca no reutilizable caché dependiente de autorización.
- Workers autorizan contexto y no aceptan mensajes alterados o reintentados fuera de scope.

Regla común; las implementaciones específicas usan Guards/Policies y filters de repositorio de cada framework.

## Procedencia documental preservada

- [Capítulo heredado: 12-authz-security.md](../../stacks/backend/nestjs/security/references/12-authz-security.md) — contenido íntegro conservado.
- [Capítulo heredado: 13-data-governance.md](../data/references/13-data-governance.md) — contenido íntegro conservado.

## Mejoras técnicas verificables — 2026

**5. Tenant antes de SQL/caché.** ✅ Derivar tenant del contexto autenticado, restringir query y claves de caché, y testear acceso cruzado. ❌ Confiar en `tenantId` arbitrario del body o incluir un usuario ajeno en una caché global.

## Checklist de seguridad de aislamiento por aplicación y datos

- Validar identidad y permisos por recurso **antes** de consultar o servir una entrada del caché.
- Aplicar filtro de tenant en todos los repositorios: listados, agregados, mutaciones, conteos y queries crudas; para RLS fijar el contexto de sesión **por transacción** y probar roles con bypass.
- Almacenar jobs con identidad delegada/tenant autorizado y volver a validar al consumir; no aceptar mensajes arbitrarios como contexto de seguridad.
- Integrar negative testing: cross-tenant IDOR, fallos de cache isolation, filtros SQL, exportaciones y consultas de analytics.
- Revisar la cardinalidad y privacidad de los identificadores en trazas y métricas.

**Matriz mínima:**

| Actor | Tenant A | Tenant B |
| --- | --- | --- |
| Usuario A con permiso lectura | Solo registros autorizados | Sin lectura ni conteos |
| Usuario A sin permiso escritura | Rechazo de cambio | Rechazo de cambio |
| Worker A | Scope A por identidad de servicio | Denegado salvo delegación explícita |

✅ Correcto: tests negativos tanto en HTTP como sobre ports SQL y workers.

❌ Incorrecto: determinar `tenantId` directamente desde el body o usar una policy HTTP como único control del sistema.

> Fuente única para **Cobertura de implementación y evidencia (ampliación)**: [abrir documento canónico](../../governance/complete-work-coverage-policy.md).

