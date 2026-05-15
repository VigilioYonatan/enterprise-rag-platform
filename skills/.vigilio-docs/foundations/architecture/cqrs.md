# CQRS pragmático: comandos y consultas sin complejidad artificial

CQRS es separar la **responsabilidad de escritura** de la **responsabilidad de lectura** cuando sus modelos o cargas divergen. No exige microservicios, dos bases de datos ni un bus de comandos para cada CRUD. En Vigilio puede implementarse con distintos repository ports en la misma aplicación y PostgreSQL.

| Escrituras (commands) | Lecturas (queries) |
| --- | --- |
| `approvePolicy`, `cancelOrder`, `processProduct` | `listProducts`, `getPolicyDetails`, `searchProducts` |
| Mutan estado y deben proteger invariantes | Construyen proyecciones eficientes sin mutar estado |
| Pueden necesitar transacción/outbox | Pueden usar caché con TTL y políticas de consistencia |

## Cuándo usar

- ✅ Correcto: separar `ProductReadRepository` (filtros, paginación) de `ProductRepository` para un agregado complejo con escrituras transaccionales.
- ❌ Incorrecto: introducir Kafka, 20 handlers y consistencia eventual para crear y listar una sola tabla.

## Consistencia de lectura

1. Definir si una respuesta requiere *read-your-writes* inmediato o tolera retraso.
2. Tras commit, invalidar caché concreto o versión de generación; documentar carrera de repoblación.
3. Para eventos críticos usar Outbox e inbox idempotente, no un `publish()` no transaccional dentro del commit.
4. Monitorear lag de proyecciones; no inventar garantías de entrega exactamente una vez.

## Verificación

Pruebas de estado inválido, concurrencia y lectura tras escritura; compatibilidad de contratos cuando cambian las proyecciones. Relación: [DDD](ddd.md), [mensajería](../../standards/messaging/outbox-idempotency.md).

## Procedencia documental preservada

- [Capítulo heredado: 14-resilience-events.md](../../standards/messaging/references/14-resilience-events.md) — contenido íntegro conservado.
- [Capítulo heredado: 45-workers-outbox-sqs.md](../../stacks/backend/nestjs/messaging/references/45-workers-outbox-sqs.md) — contenido íntegro conservado.

> Fuente única para **Cobertura de implementación y evidencia (ampliación)**: [abrir documento canónico](../../governance/complete-work-coverage-policy.md).

## Decisión técnica: CQRS, CRUD simple o proyecciones asíncronas

| Señal del sistema | Diseño mínimo suficiente | Riesgo por vigilar |
| --- | --- | --- |
| Un formulario y una lista con filtros básicos | Servicio de aplicación + repositorio | No inventar un bus de handlers |
| Escrituras con invariantes y lecturas con joins pesados | Puerto de escritura + `ProductReadRepository` | Proyección desactualizada o filtros incoherentes |
| Dashboard con muchas lecturas de cálculos caros | Read model precomputado, refrescado tras commit | Lag, invalidación, datos sensibles |
| Integración con varios servicios | Outbox → consumidor idempotente → proyección | Reintentos, orden, DLQ y consistencia eventual |

**Regla de elección:** CQRS separa modelos conceptuales de lectura y escritura; no exige separar despliegues, bases de datos ni microservicios. Empezar sin proyecciones asíncronas y evolucionar por mediciones de p95, complejidad SQL o contención.

## Ejemplo de contratos internos (no DTO HTTP)

```typescript
// Modelo de lectura: proyección tipada, sin cargar un agregado de dominio.
export type ProductSummary = Pick<
  ProductSchema,
  'id' | 'nro_poliza' | 'estado'
>;

export interface ProductReadRepository {
  findByCriteria(
    criteria: ProductCriteria,
  ): Promise<PageResult<ProductSummary>>;
}

export interface OrderRepository {
  findByIdForUpdate(
    order_id: OrderSchema['id'],
  ): Promise<OrderEntity | null>;
  save(order: OrderEntity): Promise<void>;
}
```

El servicio `listProducts()` transforma la consulta validada en criterios internos; no importa el DTO HTTP dentro de Domain. `cancelOrder()` carga el agregado, llama `order.cancel()` y confirma la transacción. **No se mezclan** respuestas paginadas públicas y entidades de escritura. En TypeScript, los tipos básicos derivan de `ProductSchema['id']` y `OrderSchema['status']`, sin alias triviales.

## Consistencia: ejemplo de una proyección por eventos

```text
T0: cancelOrder() confirma DB y outbox en la misma transacción.
T1: publicador envía evento desde outbox (posibles duplicados).
T2: consumidor deduplica por event_id y actualiza vista de lectura.
T3: GET puede observar todavía un estado anterior si consulta réplica/proyección.
```

- Para una pantalla que **exige read-your-writes**, leer de la base primaria o usar una respuesta que confirme el nuevo estado; no prometer actualización inmediata de una proyección asíncrona.
- Definir idempotencia por `(consumer_id, event_id)` con índice único y una transacción que abarque el checkpoint y la actualización.
- Medir `projection_lag_seconds`, DLQ, edad máxima de evento y reintentos; no usar `tenant_id` como etiqueta de métricas de alta cardinalidad.
- Una proyección reconstruible debe poder regenerarse desde un origen verificable; versionar cambios de contrato y probar replays.

## ✅ Correcto / ❌ Incorrecto: decisiones comprobables

✅ **Correcto:** una lectura paginada con SQL optimizado y un comando transaccional en la misma base; la separación de responsabilidades es suficiente.

❌ **Incorrecto:** migrar a Kafka + dos bases para una pantalla sencilla; asumir `exactly once`; actualizar la vista antes del commit; devolver objetos ORM desde la API.

## Checklist de aceptación específico CQRS

1. Demostrar que el comando rechaza estados inválidos incluso con dos peticiones concurrentes.
2. Probar una consulta multi-tenant que filtra antes de contar y paginar.
3. Si hay proyección asíncrona, ensayar evento duplicado, desordenado, retrasado y replay.
4. Explicitar qué endpoint ofrece consistencia fuerte y cuál puede retrasarse, con prueba observable.
5. Publicar una matriz de migración si cambia un contrato de evento, incluyendo rollback y compatibilidad.

**Implementaciones por stack, sin duplicarlas aquí:** [NestJS mensajería](../../stacks/backend/nestjs/messaging/event-envelopes.md), [Laravel colas/outbox](../../stacks/backend/laravel/messaging/queues-outbox.md) y [SQL](../../standards/data/sql-performance.md).


## Laboratorio de decisiones Senior/Staff — Correcto vs Incorrecto (2026)

Casos independientes de implementación. Cada fila representa **un ejemplo incorrecto y su alternativa correcta**; elegir la solución proporcional al producto, no aplicarla por dogma. Los ejemplos son criterios de revisión, no pruebas ejecutadas.

### 01. Aplicar event sourcing y Kafka a CRUD de un formulario
- **❌ Incorrecto**: Aplicar event sourcing y Kafka a CRUD de un formulario.
- **✅ Correcto**: Un servicio/repositorio hasta que lectura y escritura diverjan en demanda.

### 02. Consulta de dashboard reconstruye todo agregado con ORM de escritura
- **❌ Incorrecto**: Consulta de dashboard reconstruye todo agregado con ORM de escritura.
- **✅ Correcto**: Proyección de lectura con columnas mínimas e índices según EXPLAIN.

### 03. Command UpdateBalance escribe sin control de invariantes
- **❌ Incorrecto**: Command UpdateBalance escribe sin control de invariantes.
- **✅ Correcto**: Agregado y transacción protegen saldo/no duplicidad.

### 04. Publicar PaymentCreated antes del commit DB
- **❌ Incorrecto**: Publicar PaymentCreated antes del commit DB.
- **✅ Correcto**: Outbox en misma transacción, procesador idempotente.

### 05. Esperar read-your-writes desde proyección eventual sin SLA
- **❌ Incorrecto**: Esperar read-your-writes desde proyección eventual sin SLA.
- **✅ Correcto**: Elegir read primaria/consistencia explícita o informar retraso.

### 06. Actualizar proyección sin clave idempotente ante reintentos
- **❌ Incorrecto**: Actualizar proyección sin clave idempotente ante reintentos.
- **✅ Correcto**: Inbox/dedupe por event_id y versionado de esquema.

### 07. Procesar eventos fuera de orden sobrescribiendo estado reciente
- **❌ Incorrecto**: Procesar eventos fuera de orden sobrescribiendo estado reciente.
- **✅ Correcto**: Sequence/version guard y replay consistente.

### 08. Duplicar reglas de autorización en query y command sin dueño
- **❌ Incorrecto**: Duplicar reglas de autorización en query y command sin dueño.
- **✅ Correcto**: Autorización por caso de uso y protección de datos en ambas rutas.

### 09. Introducir dos bases de datos para una lectura simple
- **❌ Incorrecto**: Introducir dos bases de datos para una lectura simple.
- **✅ Correcto**: CQRS lógico con ports separados y un storage compartido.

### 10. Marcar dashboard PASS porque un query unit pasa
- **❌ Incorrecto**: Marcar dashboard PASS porque un query unit pasa.
- **✅ Correcto**: Test de command -> commit -> proyección -> consulta y observabilidad de lag.


## Ejemplo implementable y revisión del riesgo
### Ejemplo comparativo de consistencia transaccional

❌ Incorrecto (pierde eventos ante crash entre commit y publish):

```ts
await db.transaction(async tx => { await tx.updatePayment(payment); });
await broker.publish({ type: 'PaymentRecorded', paymentId: payment.id });
```

✅ Correcto (pseudocódigo tipado, adapter SQL concreto fuera de esta norma):

```ts
await db.transaction(async tx => {
  await tx.updatePayment(payment);
  await tx.insertOutbox({ id: eventId, type: 'PaymentRecorded', payload: { paymentId: payment.id } });
});
// Otro proceso lee outbox, publica con retry e idempotencia y marca delivery.
```

**No confundir:** la outbox evita el agujero transaccional, no garantiza entrega «exactamente una vez». Añadir test de caída tras commit, doble entrega, replay, orden y lag observable. CQRS no implica automáticamente usar outbox en un CRUD sencillo.

### Política de pruebas y optimización

**Gate de arquitectura:** casos de uso con aceptación/rechazo, pruebas de contrato y de regresión, revisión de dependencias y evidencia de cambios observables.

**Optimización:** medir coste real y complejidad de cambio; elegir primero el diseño más sencillo que conserva invariantes y extensibilidad comprobable.

**Criterio de salida:** incluir requisito, decisión arquitectónica, riesgo, tests ejecutados, métricas pertinentes y estado `PASS | FAIL | BLOCKED | NOT_RUN`. Un ejemplo documental o un script no ejecutado nunca justifican `PASS`.
