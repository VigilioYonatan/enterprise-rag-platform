# Refactorización segura de código existente — estándares compartidos

> **Alcance:** criterios transversales de refactorización incremental de sistemas existentes. No reemplaza reglas humanas ni ADR vigentes. La antigüedad del código no es evidencia de defecto.

## Secuencia obligatoria para un agente

1. **Establecer baseline:** revisar `AGENTS.md`, versiones **instaladas** y lockfile, tests existentes, contrato HTTP/OpenAPI y flujos del usuario. No subir versiones sólo porque hay una versión nueva disponible.
2. **Descubrir comportamiento:** identificar consumidores, rutas, permisos, reglas de negocio, trazas, jobs, datos existente y casos límite. Usar caracterización de comportamiento cuando los tests faltan.
3. **Clasificar riesgo:** error funcional, seguridad, performance medido, estilo, incompatibilidad con baseline. Separar defectos de preferencias.
4. **Crear red de seguridad:** test de comportamiento antes de refactorizar; snapshot o golden master sólo cuando sea estable y no capture secretos. Revisar datos de prueba y migración.
5. **Cambiar en pasos pequeños:** no reescribir arquitectura, renombrar APIs públicas, reemplazar ODM/ORM ni mezclar migración de datos y estilo en el mismo cambio sin necesidad.
6. **Validar:** unit/integration/contract/E2E según superficie tocada; comparar OpenAPI, logs redactados, queries, plan SQL, tiempos y perfiles con evidencia.
7. **Comunicar:** qué se preservó, qué cambió, riesgos restantes, comandos realmente ejecutados y pruebas `NOT_RUN`.

## ✅ Correcto / ❌ Incorrecto — decisiones de refactorización

| ✅ Correcto | ❌ Incorrecto | Motivo |
|---|---|---|
| `listProducts()` o `approvePolicy()` donde existe ese caso de uso | Renombrar sólo por estética cada `index()` del ecosistema, o conservar `update()` para acciones de negocio | Intención semántica sin romper APIs ajenas |
| Conservar fuente canónica del contrato público y sus proyecciones | Duplicar los mismos campos contractuales en cada adaptador | Evita deriva contractual |
| Validar requests externos en el borde y proyectar respuestas explícitamente | Confundir tipado declarado con validación en ejecución | Son garantías distintas |
| Agregar tests antes de refactorizar callbacks con efectos | Reemplazar todos los `for` por `map()` automáticamente | `map` transforma datos, no es un iterador de efectos |
| Transacción para una invariante multioperación; outbox si hay entrega fiable | Redis y SQL en una misma supuesta transacción atómica | No existe atomicidad distribuida implícita |
| Revisión de N+1, índices y paginación con datos de tamaño real | Cambiar toda consulta a eager load o cachear toda respuesta | Optimizar según consulta y seguridad |
| Validar y normalizar parámetros numéricos antes del caso de uso | Aceptar conversiones numéricas ambiguas o truncadas | Evita entradas ambiguas |
| Documentar excepciones con evidencia de contexto | Imponer dogmas SOLID/DDD para cada DTO CRUD | Evita sobrearquitectura |

## Iteración y concurrencia: norma transversal

- ✅ **Correcto:** transformar colecciones al producir valores; recorrer con operaciones de efecto explícito y concurrencia limitada.
- ❌ **Incorrecto:** usar transformaciones con resultado descartado, hacer N+1 o disparar IO ilimitado.
- Cada lenguaje tiene implementación separada en sus guías: [NestJS/TypeScript](../../stacks/backend/nestjs/quality/refactoring-examples.md) y [Laravel/PHP](../../stacks/backend/laravel/quality/refactoring-examples.md).

## Ejemplos de implementación por stack

Consultar las guías de [NestJS/TypeScript](../../stacks/backend/nestjs/quality/refactoring-examples.md) o [Laravel/PHP](../../stacks/backend/laravel/quality/refactoring-examples.md), que conservan el código original.

## Gates verificables para una migración

- Comparar número/tipo de endpoints, payloads y cambios de autenticación (incluye 401/403/404/422 y compatibilidad).
- Medir queries por request y tiempo de ejecución antes/después donde se cambió rendimiento.
- Comprobar multi-tenant y proyección allowlist para no filtrar datos.
- Registrar `PASS`, `FAIL`, `BLOCKED` y `NOT_RUN` con evidencia; no declararse producción-ready por pasar sólo `php -l` o un linter.
- Mantener feature flags/rollback cuando el cambio afecta transacciones, integración pública o producción.

**Guías específicas:** [TypeScript y NestJS](../../stacks/backend/nestjs/quality/refactoring-examples.md) · [PHP y Laravel](../../stacks/backend/laravel/quality/refactoring-examples.md) · [Colecciones y bucles](collections-and-iteration.md).

**Fuentes normativas de lenguaje/framework:** fuentes oficiales detalladas en la guía de cada stack.

> Fuente única para **Cobertura de implementación y evidencia (ampliación)**: [abrir documento canónico](../../governance/complete-work-coverage-policy.md).

