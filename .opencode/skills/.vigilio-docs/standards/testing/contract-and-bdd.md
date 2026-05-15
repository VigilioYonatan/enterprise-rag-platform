# Pruebas de contrato y BDD: política común

## Niveles

1. Unit del dominio: invariantes y value objects sin BD/framework.
2. Application: ports simulados, conflictos, errores e idempotencia.
3. Integración: PostgreSQL real con constraints/migraciones; caché Redis/Valkey en escenarios relevantes.
4. HTTP/E2E: guards/policies, contract testing, errores y autenticación.
5. BDD/Cucumber cuando existen reglas de negocio que merecen lenguaje ubicuo; no convertir todo test unitario en Gherkin.

## Conformidad OpenAPI

Desde contratos compartidos: verificar schema de request/response, campos públicos, serialización de fechas, status codes, operation IDs, auth y compatibilidad hacia atrás. Para Laravel verificar payload PHP contra OpenAPI sin crear una segunda especificación normativa.

✅ Correcto: pruebas con cuenta A/B, datos con formato inválido, 401/403/409, invalidación y transacciones fallidas.

❌ Incorrecto: afirmar 100% coverage sin tests ejecutados, mocks del repositorio sin tests de integración, snapshots que aceptan datos sensibles inesperados.

## Evidencia mínima

Registrar comando, entorno, versiones, salida, fecha, logs y estado PASS/FAIL/NOT_RUN; staging y CI no son equivalentes a producción. Referencias: [testing base](strategy.md).

## Procedencia documental preservada

- [Capítulo heredado: 7-pruebas-vitest-playwright.md](../../stacks/backend/nestjs/testing/references/7-pruebas-vitest-playwright.md) — contenido íntegro conservado.
- [Capítulo heredado: 22-cucumber-bdd.md](references/22-cucumber-bdd.md) — contenido íntegro conservado.
- [Capítulo heredado: 38-estrategia-testing-2026.md](../../stacks/backend/nestjs/testing/references/38-estrategia-testing-2026.md) — contenido íntegro conservado.

## Cobertura de implementación y evidencia (ampliación)

Estas comprobaciones concretan el tema de esta guía; aplicar solo las pertinentes al sistema consumidor y documentar exclusiones justificadas.

1. **Matriz basada en riesgo:** Para cada operación crítica cubrir camino feliz, negativos, límites, roles, concurrencia y recuperación.
2. **Infraestructura adecuada:** Usar unit para reglas puras, integration para SQL/caché y E2E para contratos observables.
3. **Aislamiento:** Controlar estado, fixtures, reloj, semillas y recursos por test; exigir paralelismo reproducible.
4. **Gate verificable:** Registrar comando, entorno, PASS|FAIL|NOT_RUN|BLOCKED y cobertura de decisiones, no solo porcentaje.
5. **Pruebas adversariales:** Probar cross-tenant, ACL, PII y expiración en distintos niveles.
6. **Referencia extensa:** Revisar los 56 controles de testing E2E y seleccionar los aplicables explícitamente.

**Matriz de escenarios vinculada:** [e2e-quality-gates](e2e-quality-gates.md).

✅ **Correcto:** conservar el flujo funcional y demostrar criterios de aceptación con tests, trazas, revisión de contratos o un plan reproducible según el riesgo.

❌ **Incorrecto:** sustituir las reglas de negocio por un resumen, copiar implementaciones de otro framework, declarar cobertura sin evidencia o presentar `NOT_RUN` como `PASS`.

**Salida mínima:** responsable del control, riesgo cubierto, evidencia verificable y estado `PASS | FAIL | NOT_RUN | BLOCKED`. Los comandos de ejemplo son ilustrativos salvo que se adjunte ejecución real.
