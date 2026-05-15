# Calidad de ingeniería transversal: legado y código nuevo

Esta guía no depende de TypeScript o PHP. Una mejora de legibilidad solo se acepta cuando preserva comportamiento, pruebas, seguridad y compatibilidad.

## Criterios para revisar un cambio

- **Cohesión:** una feature agrupa lo que cambia junto; separar tipos, constantes y objetos de valor cuando tengan dueño semántico.
- **Complejidad:** reducir bifurcaciones con funciones pequeñas y nombres concretos; evitar `any`, `mixed` u opacos como escape del tipado.
- **Contratos:** requests validados en frontera; responses tipadas y proyectadas explícitamente.
- **Recursos:** límites de memoria, timeout, tamaño de lote, consultas y reintentos.
- **Seguridad:** mínimo privilegio, evitar exposición de información y autorización por recurso/tenant.
- **Pruebas:** separar *PASS*, *FAIL* y *NOT RUN*, no declarar lo que no se ejecutó.

## Colecciones: elegir por intención

```typescript
// ✅ Transformación pura, map devuelve la nueva colección
const ids = products.map(product => product.id);
// ✅ Efectos secuenciales controlados
for (const product of products) await approveProduct(product);
// ❌ forEach no espera las promesas devueltas por callbacks async
products.forEach(async product => { await approveProduct(product); });
```

✅ Correcto: `for` indexado para algoritmos que precisan posición, `map()` para proyección, `for...of` para efectos seriales; concurrencia limitada para I/O masivo.

❌ Incorrecto: prohibir todo `for`, cambiar a `Promise.all` sin tope cuando hay cuotas/DB pool, crear objetos nuevos sin necesidad.

## Política para existente

1. Caracterizar endpoints, permisos, fixtures y contratos reales.
2. Añadir pruebas de caracterización/observación antes de refactorizar.
3. Cambiar un solo límite de responsabilidad por PR, sin rediseño masivo automático.
4. Medir p95, errores, queries, dependencias, costo y paridad del OpenAPI.

Ver [modernización transversal](../../standards/engineering/refactoring-existing-code.md) y [guía de iteraciones](../../standards/engineering/collections-and-iteration.md).

## Procedencia documental preservada

- [Capítulo heredado: 20-reglas-senior-codigo.md](../../stacks/backend/nestjs/quality/references/20-reglas-senior-codigo.md) — contenido íntegro conservado.
- [Capítulo heredado: 36-deuda-tecnica.md](../../stacks/backend/nestjs/quality/references/36-deuda-tecnica.md) — contenido íntegro conservado.

## Cobertura de implementación y evidencia (ampliación)

Estas comprobaciones concretan el tema de esta guía; aplicar solo las pertinentes al sistema consumidor y documentar exclusiones justificadas.

1. **Complejidad real:** Usar el cambio más pequeño que mantiene la semántica; medir mantenimiento, legibilidad y riesgo de regresión.
2. **Control de decisiones:** Explicar excepciones a reglas de estilo con condiciones verificables, no con autoridad implícita.
3. **Seguridad por defecto:** Evitar side effects ocultos; separar transformación pura de I/O y operaciones transaccionales.
4. **Testabilidad:** Diseñar interfaces mínimas que permitan comprobar reglas sin reimplementar dependencias en mocks.

✅ **Correcto:** conservar el flujo funcional y demostrar criterios de aceptación con tests, trazas, revisión de contratos o un plan reproducible según el riesgo.

❌ **Incorrecto:** sustituir las reglas de negocio por un resumen, copiar implementaciones de otro framework, declarar cobertura sin evidencia o presentar `NOT_RUN` como `PASS`.

**Salida mínima:** responsable del control, riesgo cubierto, evidencia verificable y estado `PASS | FAIL | NOT_RUN | BLOCKED`. Los comandos de ejemplo son ilustrativos salvo que se adjunte ejecución real.

## Calidad por cambio: diseño, comportamiento, seguridad y operación

| Dimensión | Pregunta verificable | Evidencia razonable |
| --- | --- | --- |
| Correctitud | ¿La operación respeta invariantes y contratos? | Pruebas negativas, unitarias y HTTP |
| Cohesión | ¿Cada módulo tiene responsabilidad clara? | Imports, ownership y revisión del diff |
| DRY | ¿La regla existe en una sola fuente normativa? | Referencia a schema/DTO común y contratos |
| Rendimiento | ¿Cambia consultas, memoria, I/O, reintentos? | EXPLAIN, pruebas de volumen, p95 |
| Seguridad | ¿Hay autorización por recurso, tenant y secretos? | Tests 401/403 y cross-tenant |
| Mantenimiento | ¿El cambio introduce compatibilidad rota? | Diff OpenAPI, semver, test de consumidor |

## Refactor: medición antes y después

1. Capturar el comportamiento previo con fixtures y tests de caracterización.
2. Definir una sola meta por PR: eliminar duplicación, mejorar consulta o reducir acoplamiento; no mezclarla con un rewrite completo.
3. Cambiar implementación interna conservando semántica HTTP, eventos, idempotencia y autorización.
4. Ejecutar pruebas focalizadas, integración con DB cuando hay SQL y smoke en runtime afectado.
5. Registrar límites y comandos ejecutados. `NOT_RUN` es una conclusión válida; presentarlo como `PASS` no lo es.

## Ejemplo de manejo de concurrencia I/O

```typescript
// ✅ Correcto: limitar concurrencia cuando pool o proveedor tiene cuotas.
for (const batch of batches) {
  await processBatch(batch);
}

// ❌ Incorrecto: generar 100000 operaciones simultáneas sin backpressure.
await Promise.all(products.map((product) => processProduct(product)));
```

La versión secuencial puede ser lenta; usar un pool de concurrencia acotada y métricas cuando el throughput lo exija. El tamaño apropiado depende de pruebas con recursos reales, no de un número universal. `map` es ideal para **proyección pura**; `for...of` expresa efecto/espera secuencial; `for` indexado es correcto cuando la posición importa.

## Anti-patrones con remediación

- ❌ **Incorrecto:** usar cast `as ProductSchema` para presentar JSON de terceros como validado. ✅ **Correcto:** validar en el borde de confianza cuando el runtime debe garantizar formato.
- ❌ **Incorrecto:** crear `ProductId`, `ProductStatus` y `ProductType` solo para renombrar campos de `ProductSchema`. ✅ **Correcto:** `ProductSchema['id']` y accesos indexados directos cuando no hay semántica añadida.
- ❌ **Incorrecto:** schemas HTTP + validadores HTTP + DTO duplicados. ✅ **Correcto:** contrato Zod y tipo `z.output` en el mismo `*.dto.ts` según el estándar Vigilio.
- ❌ **Incorrecto:** variables camelCase ordinarias si el código propio usa `snake_case`. ✅ **Correcto:** `order_id`, `query_client` en variables y `orderRepository` en constructor DI, preservando las APIs de terceros.

Las herramientas concretas de PHP, Node, React y Expo pertenecen a sus guías de calidad; consultar [estándar de nombres](../../standards/engineering/naming-and-boundaries.md), [tests](../../standards/testing/strategy.md) y [SQL](../../standards/data/sql-performance.md), sin copiar los procedimientos entre stacks.


## Laboratorio de decisiones Senior/Staff — Correcto vs Incorrecto (2026)

Casos independientes de implementación. Cada fila representa **un ejemplo incorrecto y su alternativa correcta**; elegir la solución proporcional al producto, no aplicarla por dogma. Los ejemplos son criterios de revisión, no pruebas ejecutadas.

### 01. Test que valida sólo snapshot, no resultado observable
- **❌ Incorrecto**: Test que valida sólo snapshot, no resultado observable.
- **✅ Correcto**: Probar contrato de negocio, errores y efectos relevantes.

### 02. Refactoring masivo junto a feature y sin caracterización
- **❌ Incorrecto**: Refactoring masivo junto a feature y sin caracterización.
- **✅ Correcto**: Primero tests de caracterización, cambios pequeños y PR revisables.

### 03. Variable `x` y booleano `flag` sin semántica
- **❌ Incorrecto**: Variable `x` y booleano `flag` sin semántica.
- **✅ Correcto**: Nombres de dominio claros, unidades y límites expresados.

### 04. Archivo de 1000 líneas que mezcla red/UI/SQL
- **❌ Incorrecto**: Archivo de 1000 líneas que mezcla red/UI/SQL.
- **✅ Correcto**: Extraer por responsabilidad y pruebas conservadas, no por umbral mágico.

### 05. Optimizar rendimiento sin perfilador
- **❌ Incorrecto**: Optimizar rendimiento sin perfilador.
- **✅ Correcto**: Medir baseline p95/memoria y comparar antes/después.

### Política de pruebas y optimización

**Gate de arquitectura:** casos de uso con aceptación/rechazo, pruebas de contrato y de regresión, revisión de dependencias y evidencia de cambios observables.

**Optimización:** medir coste real y complejidad de cambio; elegir primero el diseño más sencillo que conserva invariantes y extensibilidad comprobable.

**Criterio de salida:** incluir requisito, decisión arquitectónica, riesgo, tests ejecutados, métricas pertinentes y estado `PASS | FAIL | BLOCKED | NOT_RUN`. Un ejemplo documental o un script no ejecutado nunca justifican `PASS`.
