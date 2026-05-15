# Playbook: crear una feature NestJS o Laravel sin duplicar estándares

1. Leer AGENTS/rules de proyecto y módulo vecino: elegir stack y runtime confirmados, obtener baseline aprobado y lockfile.
2. Leer [DDD](../foundations/architecture/ddd.md), [contratos](../standards/api/contracts.md), [autorización](../standards/security/authorization.md) según capacidad solicitada.
3. Definir use case semántico; CRUD sin dominio puede usar read model; si existe transición, agregado protege invariantes.
4. Implementación NestJS → [guía original](../stacks/backend/nestjs/architecture/references/21-golden-path-feature.md). Laravel → [golden path](../stacks/backend/laravel/golden-path-feature.md).
5. Reutilizar schema Zod+OpenAPI en TS, proyección concreta API Resource en Laravel y tests de contrato.
6. Cache opcional con TTL + invalidación correcta; DB transaction + outbox si evento fiable; contexto tenant.
7. Ejecutar tests unit/integration/feature/contract, static checks, security gates, docs links y trazas; escribir resultados reales, no marcar PASS sin ejecutar.
8. Si se altera contrato API, aplicar OpenAPI diff y versionamiento/ADR.

**Salida esperada:** diff acotado, tests y evidencias, explicación de tradeoffs, comandos ejecutados, decisiones no resueltas.

## ✅ Correcto / ❌ Incorrecto: revisión 2026

- ✅ **Correcto:** Mantener invariantes en el agregado cuando existan; nombre semántico y ports desacoplados de framework/ORM.
- ❌ **Incorrecto:** DDD ceremonial para CRUD trivial, lógica de dominio en controller, repositorio retornando mensajes HTTP del negocio sin necesidad.
- **Al recibir código existente:** primero caracterizar el comportamiento, después refactorizar en pasos comprobables. [Guía canónica de modernización](../standards/engineering/refactoring-existing-code.md).

## Plan de ejecución de una feature

1. Identificar feature vecina y contrato existente. Buscar aprobación humana para cambios que afecten reglas del producto.
2. Derivar schema/DTO de fuente canónica; para Node: Zod `.pick()`, `z.infer`, paginador; para PHP: FormRequest, readonly DTO, Resource y mismo OpenAPI.
3. Definir caso de uso semántico; agregar entidad/invariantes si existe negocio, sin DDD ceremonial.
4. Definir port/adaptador DB, transaction scope, tenant y caché sólo cuando esté justificada.
5. Crear unit, integración, HTTP, contrato y pruebas negativas; actualizar documentación por stack, no normas compartidas redundantes.
6. Ejecutar gates y entregar evidencia con `PASS/FAIL/BLOCKED/NOT_RUN`.

✅ Mantener cambios pequeños y trazables. ❌ Refactorizar todos los controladores existente por renombrar `index()` sin tests ni contrato.

## Cobertura de implementación y evidencia (ampliación)

Estas comprobaciones concretan el tema de esta guía; aplicar solo las pertinentes al sistema consumidor y documentar exclusiones justificadas.

1. **Entrada explícita:** Definir precondiciones, autoridades y acceso antes de ejecutar el procedimiento.
2. **Secuencia segura:** Enumerar pasos verificables, señales de parada y responsables de aprobación.
3. **Rollback:** Documentar cómo volver al estado anterior y qué datos no deben revertirse.
4. **Evidencia de salida:** Registrar artefactos, enlaces, comandos y estados PASS|FAIL|NOT_RUN|BLOCKED.
5. **Casos límite:** Incluir recuperación de servicio ausente, contratos incompatibles y permisos insuficientes.

✅ **Correcto:** conservar el flujo funcional y demostrar criterios de aceptación con tests, trazas, revisión de contratos o un plan reproducible según el riesgo.

❌ **Incorrecto:** sustituir las reglas de negocio por un resumen, copiar implementaciones de otro framework, declarar cobertura sin evidencia o presentar `NOT_RUN` como `PASS`.

**Salida mínima:** responsable del control, riesgo cubierto, evidencia verificable y estado `PASS | FAIL | NOT_RUN | BLOCKED`. Los comandos de ejemplo son ilustrativos salvo que se adjunte ejecución real.
