# Migración conservadora de documentación multistack — Vigilio

## Objetivo y precedencia

Evitar reglas duplicadas entre NestJS, Laravel y futuras tecnologías. La fuente canónica compartida se encuentra en `foundations/` (DDD, SOLID, hexagonal), `standards/` (contratos, seguridad, testing, caché, observabilidad, CI/CD), `technology/` (versiones estables verificadas) y `platform/` (Kubernetes, cloud, GitOps). `stacks/backend/{nestjs,laravel}/` describe la implementación real por framework.

## Reglas que el agente debe aplicar

1. **No inventar dependencias ni versiones.** Examinar lockfiles y el baseline aprobado del consumidor; documentar cualquier incompatibilidad.
2. **Controllers delgados.** `listProducts()`, `registerProduct()`, `approvePolicy()` o `cancelOrder()` cuando expresen la intención del caso de uso; persistencia con `save()` y consultas con `findById()` cuando sean técnicas.
3. **Contratos sin duplicación.** NestJS comparte schemas Zod y DTOs derivados con `.pick()` / `z.infer` y `createPaginatorDto()`. Frontend puede tipar JSON conocido sin parse redundante, con tests de contrato y selección explícita de campos. Laravel implementa el OpenAPI canónico con Form Requests, DTO PHP y Resources.
4. **Reglas de dominio en el dominio.** No forzar agregados vacíos; invariantes transaccionales y operaciones semánticas cuando hay comportamiento real. `constants/`, `types/`, `enums/` se crean únicamente cuando aporten valor.
5. **Caché segura.** No usar `DEL('items:*')` como borrado por patrón, ni barridos `KEYS` en camino crítico; invalidación por clave o versión y TTL; manejar fallos, carreras e aislamiento tenant.
6. **Observabilidad transversal.** Logs estructurados sin datos sensibles, métricas de baja cardinalidad, OpenTelemetry y tests de alertas; no repetir instrumentación en cada controller.
7. **existente.** `map` para transformaciones, `for...of`/`foreach` para efectos y secuencialidad, `for` indexado cuando la lógica lo requiera; jamás `forEach(async)` esperando ejecución secuencial. No refactorizar sin pruebas de caracterización.
8. **Separar infraestructura.** EKS y Lambda son perfiles distintos, no normas generales del framework.

## Flujo de migración

- Inventariar archivos, rutas, secciones, longitud y SHA-256 antes de mover.
- Clasificar cada sección: común, específica de framework, específica de runtime, decisión histórica o ejemplo.
- Preservar íntegros los manuales previos como referencias contextualizadas en sus áreas finales; no crear otra jerarquía global existente.
- Migrar el punto de entrada normativo; preferir enlaces a textos duplicados.
- Actualizar sidebar, README, skills, snapshots npm, manifests y HTML generado (no tocar la plantilla `index.html`).
- Comparar correspondencia 1:1 de fuentes, resolver enlaces locales y ejecutar las suites disponibles.
- Informar por separado de la integridad documental y de la validación ejecutable real.

## ✅ Correcto

```typescript
const items = products.map((product) => ({ id: product.id, nro_poliza: product.nro_poliza }));
for (const item of items) await auditProduct(item);
```

## ❌ Incorrecto

```typescript
products.forEach(async (product) => { await auditProduct(product); }); // las promesas no se esperan
```

## Evidencias exigidas

- Conteo de capítulos preservados, manifiesto original→nuevo y ausencia de ficheros nuevos no permitidos.
- Resultado de validación de enlaces y navegación (fuente y `_site/`).
- Verificación de snapshot npm e instalación aislada de skills.
- Gates reales no ejecutados deben marcarse PENDIENTES, no PASS.

> Fuente única para **Cobertura de implementación y evidencia (ampliación)**: [abrir documento canónico](../governance/complete-work-coverage-policy.md).

