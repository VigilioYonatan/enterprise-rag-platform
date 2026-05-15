# NestJS: pruebas unitarias de dominio, Zod y servicios con Vitest

## Estrategia

Dominio y schemas se prueban sin bootstrapping NestJS; application services se prueban con ports falsos. Evitar mocks que reimplementan completamente el código que pretenden comprobar. Aislar reloj/UUID y side effects externos.

```typescript
import { describe, expect, it } from 'vitest';
describe('listProductsQueryDto', () => {
  it('convierte limit HTTP numérico a number', () => {
    const parsed = listProductsQueryDto.parse({ limit: '25' });
    expect(parsed.limit).toBe(25);
  });
  it('rechaza out-of-range', () => {
    expect(listProductsQueryDto.safeParse({ limit: '101' }).success).toBe(false);
  });
});
```

Casos de negocio: `OrderEntity.cancel()` es idempotente **solo si la regla de negocio lo exige**; testear cancelación repetida, bloqueo si `status === 'shipped'`, estado sin cambio tras error y no acceso cross-tenant. los métodos usan `OrderSchema['status']` directamente. Testear proyección de salidas para evitar exponer atributos internos aunque el TypeScript compile.

✅ Correcto: pruebas de `limit=abc`, `limit=`, `offset=-1`, estado inválido, repositorio falla, caché miss/hit.

❌ Incorrecto: `it('works',()=>expect(true).toBe(true))`, aprobar reglas con snapshots sin aserciones de privacidad o simular una BD para validar SQL.

**Gates:** tests ejecutados y evidencia; cobertura de decisiones críticas, no solo porcentaje general; si el consumidor no posee `pnpm test:unit`, reportar NOT_RUN y comandos reales. [Testing transversal](../../../../standards/testing/contract-and-bdd.md).

> Fuente única para **Procedencia documental preservada**: [abrir documento canónico](integration-contract.md).


## Cobertura de implementación y evidencia (ampliación)

Estas comprobaciones concretan el tema de esta guía; aplicar solo las pertinentes al sistema consumidor y documentar exclusiones justificadas.

1. **Invariantes:** Probar casos de aceptación y rechazo de transition semántica.
2. **Coerción:** Probar limit inválido y límites, con `safeParse()` y no casts.
3. **Side effects:** Separar mocks estrictos para puerto de I/O de tests SQL reales.
4. **Determinismo:** Inyectar reloj/UUID para reproducibilidad.
5. **Cobertura:** Buscar ramas de dominio y errores, no maximizar porcentajes sin valor.
6. **Regresión:** Vincular cambios a una matriz E2E de escenarios críticos sin duplicar pruebas.

**Matriz de escenarios vinculada:** [e2e-http](e2e-http.md).

✅ **Correcto:** conservar el flujo funcional y demostrar criterios de aceptación con tests, trazas, revisión de contratos o un plan reproducible según el riesgo.

❌ **Incorrecto:** sustituir las reglas de negocio por un resumen, copiar implementaciones de otro framework, declarar cobertura sin evidencia o presentar `NOT_RUN` como `PASS`.

**Salida mínima:** responsable del control, riesgo cubierto, evidencia verificable y estado `PASS | FAIL | NOT_RUN | BLOCKED`. Los comandos de ejemplo son ilustrativos salvo que se adjunte ejecución real.
