# Colecciones, `for`, `for...of`, `map` y `foreach`: elegir por semántica, no por moda

## Principios

**No prohibir `for (let i = ...)` de forma absoluta.** Un bucle indexado puede ser correcto para ventanas deslizantes, búsqueda con índices, buffers, recorridos de rango y optimizaciones demostradas. Lo incorrecto es preferir una sintaxis por dogma ignorando side effects, memoria, límites y semántica asíncrona.

| Necesidad | ✅ Correcto | ❌ Incorrecto |
|---|---|---|
| Transformar datos | Operación que devuelve una nueva colección | Invocar transformación y descartar su resultado |
| Recorrer con efectos | Iteración idiomática del lenguaje, con control de error y orden | Paralelizar sin esperar, sin límite y sin registrar errores |
| Filtrar o buscar | Primitiva de selección expresiva | Usar transformaciones para filtrar sin necesitarlas |
| Algoritmos con posiciones | Bucle indexado cuando existe una razón concreta | Reescribirlo por estética y alterar complejidad |
| Lotes y base de datos | Batch, cursor o paginación con contratos correctos | Cientos de consultas por fila sin medir N+1 |


## Ejemplos TypeScript en el stack propietario

Consultar los [ejemplos completos](../../stacks/backend/nestjs/quality/refactoring-examples.md), trasladados sin perder el código.

## Ejemplos PHP en el stack propietario

Consultar los [ejemplos completos](../../stacks/backend/laravel/quality/refactoring-examples.md), trasladados sin perder el código.

## Revisión de código existente

1. Identificar si el callback *retorna datos* o *produce efectos*; anotar excepciones justificadas.
2. Comprobar `await`/retries/rate limits y orden antes de sustituir un bucle.
3. Comprobar espacio en memoria, SQL N+1, eager loading y batch.
4. Comparar resultados y latencia con test del comportamiento anterior; evitar refactorizar `for` en código crítico sin prueba.
5. Revisar logs para no registrar credenciales, datos personales ni cardinalidades incontroladas.

Referencias especializadas en las guías de cada stack; esta política es transversal.

## ✅ Correcto / ❌ Incorrecto: revisión 2026

- ✅ **Correcto:** Leer contexto real, seguir normas canónicas y documentar precondiciones, ejemplos, contraejemplos y verificación.
- ❌ **Incorrecto:** Copiar snippets sin imports, asumir versiones instaladas o declarar pruebas `PASS` sin ejecutarlas.
- **Al recibir código existente:** primero caracterizar el comportamiento, después refactorizar en pasos comprobables. [Guía canónica de modernización](refactoring-existing-code.md).

## Cobertura de implementación y evidencia (ampliación)

Estas comprobaciones concretan el tema de esta guía; aplicar solo las pertinentes al sistema consumidor y documentar exclusiones justificadas.

1. **Caracterización:** Congelar comportamiento existente y reglas de negocio antes de refactorizar.
2. **Cambios pequeños:** Mover responsabilidades paso a paso con pruebas y contrato sin pérdida.
3. **Medición:** Comparar complejidad, regresiones y beneficios reales antes/después.
4. **Regla y excepción:** Definir casos donde loop, map, foreach o side effects son correctos en lugar de prohibiciones absolutas.
5. **Trazabilidad:** Guardar origen→destino de decisiones y evidencia de que el consumidor usa la nueva ruta.

✅ **Correcto:** conservar el flujo funcional y demostrar criterios de aceptación con tests, trazas, revisión de contratos o un plan reproducible según el riesgo.

❌ **Incorrecto:** sustituir las reglas de negocio por un resumen, copiar implementaciones de otro framework, declarar cobertura sin evidencia o presentar `NOT_RUN` como `PASS`.

**Salida mínima:** responsable del control, riesgo cubierto, evidencia verificable y estado `PASS | FAIL | NOT_RUN | BLOCKED`. Los comandos de ejemplo son ilustrativos salvo que se adjunte ejecución real.
