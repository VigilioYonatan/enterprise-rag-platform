# Estrategia Backend de Pruebas por Riesgo

Esta guia es la fuente canonica transversal para seleccionar escenarios. Cada stack conserva sus
runners, fixtures, thresholds y comandos concretos.

## Matriz de riesgos

| Cambio | Riesgos minimos a considerar |
| --- | --- |
| DTO/schema | valido, invalido, limite y normalizacion |
| servicio de aplicacion | exito, ausencia, conflicto/carrera y fallo de dependencia |
| repositorio | persistencia, mapping, constraint y mutaciones |
| auth/policy | publico si aplica, ausente, malformado, valido y permiso insuficiente |
| integracion externa | mapping de request, exito, error del proveedor y liberacion de recursos |
| endpoint | exito y errores publicos relevantes segun contrato |
| migracion | forward, compatibilidad, backfill y rollback/recovery ensayado |
| cache | hit, miss, invalidacion y timeout/fallo |

La tabla es un catalogo de riesgos, no una orden de repetir todos los casos en cada capa. Colocar cada
escenario en la capa mas barata que pruebe el riesgo real.

## Diseño de escenarios

- Derivar escenarios del contrato: happy path, limite/invalido, ausencia, conflicto/concurrencia,
  autorizacion y fallo de dependencia segun aplique.
- Probar la cadena de nombres y datos que cruza contrato, parser, schema, controller, servicio y adapter.
- Mockear el limite externo mas cercano, no las capas propias que se intenta verificar.
- Usar base real aislada para constraints, transacciones y SQL cuando el stack lo requiera.
- En BDD, expresar comportamiento y resultados observables, no cada llamada interna.
- Mantener fixtures pequeñas, deterministas, tipadas y sin secretos/PII.
- Verificar errores tipados y respuestas publicas; no aceptar cualquier excepcion con assertions debiles.

## Ejemplo sin duplicacion

Para crear una liquidacion idempotente:

| Riesgo | Capa mas barata suficiente | Evidencia |
| --- | --- | --- |
| importe invalido | unit del schema/validator | rechaza el valor y devuelve error tipado |
| referencia repetida | integration con DB real | unique constraint y conflicto publico |
| proveedor caido | unit del servicio con port mockeado | no confirma estado y conserva causa segura |
| contrato HTTP | E2E/contract | request `201`, duplicado `409` y auth segun contrato |

No repetir el mismo happy path en cuatro capas. Cada test debe declarar riesgo, limite y salida
observable.

## Calidad de evidencia

- Respetar thresholds y comandos del repositorio; no inventar porcentajes universales.
- Un test de regresion falla sin la correccion y pasa con ella.
- No usar sleeps, retries, `skip` o assertions debiles para ocultar flakiness.
- No afirmar que una capa paso si su DB, servicio o infraestructura no estuvo disponible.
- Registrar comando, exit code, alcance y cualquier gate omitido o bloqueado.

Para Node/Nest, completar esta baseline con
[Pruebas Vitest y Playwright](../stacks/backend/nestjs/testing/references/7-pruebas-vitest-playwright.md) y
[Estrategia de testing 2026](../stacks/backend/nestjs/testing/references/38-estrategia-testing-2026.md).

