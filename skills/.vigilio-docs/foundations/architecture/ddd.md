# DDD pragmático: modelo de dominio y casos de uso

## Política común

1. Nombrar comandos por intención del dominio: `approvePolicy`, `cancelOrder`, `activateSubscription`, `calculatePremium` o `processProduct` únicamente cuando esa operación exista realmente.
2. Queries también usan nombres expresivos: `listProducts`, `searchProducts`, `getProductById`. No es obligatorio crear un agregado para consultas CRUD.
3. Controller adapta el transporte. Use Case coordina. El agregado protege invariantes. Repository Port define persistencia; el adapter ejecuta SQL o Eloquent.
4. `save`, `findById` son nombres técnicos aceptables en adapters/ports. No confundirlos con acciones de negocio.
5. Reservar entidad/agregado para estados, invariantes, consistencia y eventos reales; evitar entidades ceremoniales.
6. Una transacción asegura el cambio completo de un agregado; para concurrencia utilizar versión optimista o bloqueo efectivo en DB.
7. Distinguir tipos internos del dominio de contratos públicos HTTP; no cargar `JsonResponse`, decorators NestJS ni ORM en `Domain/`.

## Flujo de una orden

```text
POST /orders/{id}/cancel
  -> Controller.cancelOrder
  -> CancelOrderUseCase.cancelOrder
  -> Repository.findByIdForUpdate + OrderEntity.cancel() + Repository.save
  -> commit DB -> evento/invalidación fiable -> Presenter HTTP
```

## Organización

- `domain/enums` agrupa estados cerrados; `domain/constants` límites de negocio; `domain/types` tipos propios de dominio cuando añadan semántica; `domain/value-objects` invariantes y representación de conceptos.
- En TypeScript: `OrderSchema['status']` desde `order.schema.ts`; `OrderEntity.cancel()` protege la transición, mientras `OrderService.cancelOrder()` orquesta. Entrada HTTP Zod vive en `*.dto.ts`, DTO en `*.dto.ts`. [Fronteras canónicas](../../standards/api/http-dtos-and-contracts.md).
- En PHP usar `enum`, `readonly` y tipos nativos. En TypeScript evitar duplicar `z.infer` en `domain/types`; los DTO permanecen junto a su schema.
- Un schema público `productSchema` reutilizable con `.pick()` se conserva como **contrato**, no se convierte automáticamente en entidad de dominio.

**Pruebas exigidas:** transición válida, estado inválido, duplicación, concurrencia y aislamiento por tenant cuando aplica.

Referencias de implementación: [NestJS](../../stacks/backend/nestjs/architecture/references/21-golden-path-feature.md) y [Laravel](../../stacks/backend/laravel/application/use-cases.md).

## ✅ Correcto / ❌ Incorrecto: revisión 2026

- ✅ **Correcto:** Mantener invariantes en el agregado cuando existan; nombre semántico y ports desacoplados de framework/ORM.
- ❌ **Incorrecto:** DDD ceremonial para CRUD trivial, lógica de dominio en controller, repositorio retornando mensajes HTTP del negocio sin necesidad.
- **Al recibir código existente:** primero caracterizar el comportamiento, después refactorizar en pasos comprobables. [Guía canónica de modernización](../../standards/engineering/refactoring-existing-code.md).

## Decidir si necesita DDD rico

| Señal observable | Decisión |
| --- | --- |
| Lectura/listado con filtros, sin invariantes | Query service + read model + proyección HTTP; sin agregado artificial |
| Transiciones restringidas, límite de crédito, fondos | Agregado con método semántico e invariantes testeables |
| Varias tablas bajo una consistencia local | Definir límite de agregado, transacción y lock/versionado |
| Cambios entre servicios | Evento de integración, outbox e idempotencia; no simular transacción distribuida |

**La intención del negocio no debe confundirse con el protocolo:** `POST /orders/{id}/cancel` es HTTP; `cancelOrder()` es el caso de uso; `OrderEntity.cancel()` decide si está permitido. Un `save()` en el repositorio sigue siendo técnico y correcto.

```typescript
// Ejemplo TypeScript: OrderData se infiere del schema propietario de Order.
// import type { OrderData } from la ruta del contrato/schemas del consumidor
// En Laravel equivale a tipos nativos y enum PHP.
export class Order {
  constructor(readonly id: OrderData['id'], private status: OrderData['status']) {}
  cancel(): void {
    if (this.status === 'shipped') throw new Error('ShippedOrderCannotBeCancelled');
    if (this.status === 'cancelled') return; // política de idempotencia explícita
    this.status = 'cancelled';
  }
  currentStatus() { return this.status; }
}
```

✅ La prueba `shipped -> cancel()` falla sin boot de NestJS/Laravel. ❌ Crear un `OrderService` que únicamente delega a ORM y no añade política, o validar reglas solo en el controller.

## Concurrencia, eventos y contratos

- Evitar doble aprobación/anulación con `version` optimista (`WHERE id=? AND version=?`) o bloqueo dentro de transacción. Medir conflictos.
- Emitir eventos externos **después del commit**, preferiblemente con outbox transaccional si no se tolera pérdida; deduplicar por event ID.
- No exportar una entidad de dominio ni un `Model` Eloquent directamente como respuesta; usar proyección allowlist y contrato OpenAPI canónico.
- Separar `domain/enums`, `domain/constants`, `domain/types` y value objects solo si el concepto se reutiliza y añade semántica; no copiar el DTO público al dominio.

**Gate mínimo:** test de transición válida, ilegal, idempotente y concurrente; prueba de autorización por tenant; contrato HTTP y operación de rollback o compensación documentados.

## Mejoras técnicas verificables — 2026

**1. Invariantes con nombres semánticos.** ✅ `approvePolicy()` valida transición y permisos mediante caso de uso + agregado. ❌ Reemplazar una operación de negocio por `update({ estado: ... })` sin invariante. El repositorio puede utilizar `save()` porque es un puerto técnico; no hay que inventar un agregado para lectura simple.

## Lenguaje ubicuo y límites reales del dominio

| Pregunta de descubrimiento | Respuesta que debe documentarse |
| --- | --- |
| ¿Qué significa *cancelar* una orden? | Quién puede hacerlo, estados permitidos y efectos |
| ¿Qué cambia de forma atómica? | Campos del agregado y registros de consistencia local |
| ¿Cómo se identifica el agregado? | ID, tenant y política de acceso; no una entidad Eloquent |
| ¿Qué no es dominio? | Paginación HTTP, cookies, logging, SDK, Decorators |

La expresión `ProductSchema` es el **tipo estructural inferido** de `productSchema`; `OrderEntity` es una entidad con identidad e invariantes. No reemplazar mecánicamente una entidad rica por un objeto plano. Un read model (`ProductSummary`) puede ser un `Pick<ProductSchema, ...>` sin una clase de dominio.

## Transiciones y pruebas de un agregado

```typescript
// Fragmento conceptual: el archivo order.schema.ts declara orderSchema
// y exporta type OrderSchema = z.infer<typeof orderSchema>.
export class OrderEntity {
  constructor(
    readonly id: OrderSchema['id'],
    private status: OrderSchema['status'],
  ) {}

  cancel(): void {
    if (this.status === 'cancelled') return; // idempotencia acordada
    if (this.status === 'shipped') {
      throw new OrderAlreadyShippedError();
    }
    this.status = 'cancelled';
  }

  getStatus(): OrderSchema['status'] {
    return this.status;
  }
}
```

**No crear** `type OrderStatus = 'pending' | 'cancelled' | 'shipped'` como segunda lista de estados ni `OrderId` si `OrderSchema['id']` ya basta. Las invariantes deben seguir comprobándose en runtime aunque los parámetros TypeScript estén tipados. El servicio de aplicación y el controller llaman `cancelOrder()`; el dominio llama `cancel()`.

## Domain Events frente a eventos de integración

- El evento de dominio describe un hecho de negocio dentro del bounded context. No garantiza por sí solo su publicación externa.
- El evento de integración tiene contrato de compatibilidad, `event_id`, `event_type`, `schema_version`, `occurred_at`, `tenant_id`, `payload` y estrategia de consumidores.
- Persistir estado y outbox en la misma transacción cuando el evento debe sobrevivir al commit. Ver [outbox/idempotencia](../../standards/messaging/outbox-idempotency.md).
- Un dominio con necesidades puramente CRUD puede usar Application + Repository sencillo: DDD pragmático **no** obliga a eventos, factories o CQRS.

## ✅ Correcto / ❌ Incorrecto: cuatro escenarios

| Escenario | ✅ Correcto | ❌ Incorrecto |
| --- | --- | --- |
| Cancelar orden enviada | Error de dominio + mapeo a HTTP 409 | `UPDATE orders SET status='cancelled'` sin invariante |
| Listar productos | Proyección paginada tipada, sin cargar agregados | Instanciar entidad rica por cada fila para una tabla UI |
| Aprobar dos veces | Idempotencia explícita y control de versión/lock | Confiar únicamente en un `if` previo a una escritura concurrente |
| Tenant | Identidad confiable + predicado de consulta | Aceptar `tenant_id` enviado por formulario como autorización |

**Gate mínimo:** un test unitario del agregado sin framework; uno de application con repository falso; integración PostgreSQL para concurrencia/tenant; prueba HTTP de validación y autorización. [Testing común](../../standards/testing/strategy.md).


## Laboratorio de decisiones Senior/Staff — Correcto vs Incorrecto (2026)

Casos independientes de implementación. Cada fila representa **un ejemplo incorrecto y su alternativa correcta**; elegir la solución proporcional al producto, no aplicarla por dogma. Los ejemplos son criterios de revisión, no pruebas ejecutadas.

### 01. Agregado Order acepta cancelación después de envío sin invariante
- **❌ Incorrecto**: Agregado Order acepta cancelación después de envío sin invariante.
- **✅ Correcto**: Order.cancel aplica transición y pruebas de estado inválido.

### 02. Dominio depende de Prisma model y NestJS decorators
- **❌ Incorrecto**: Dominio depende de Prisma model y NestJS decorators.
- **✅ Correcto**: Tipos del dominio sin framework; adaptación en infrastructure.

### 03. Crear entidad por tabla join
- **❌ Incorrecto**: Crear entidad por tabla join.
- **✅ Correcto**: Entidad por identidad/invariante y value object para conceptos sin identidad.

### 04. Ubicar regla de crédito en controller web
- **❌ Incorrecto**: Ubicar regla de crédito en controller web.
- **✅ Correcto**: Bounded context de crédito define políticas y casos de uso.

### 05. Compartir entidad User monolítica entre identidad, facturación y juegos
- **❌ Incorrecto**: Compartir entidad User monolítica entre identidad, facturación y juegos.
- **✅ Correcto**: Contextos separados y traducción de conceptos en la frontera.

### 06. Event payload contiene objeto completo con campos privados
- **❌ Incorrecto**: Event payload contiene objeto completo con campos privados.
- **✅ Correcto**: Evento de dominio mínimo, tipado y sin secretos.

### 07. Crear repository genérico por tabla
- **❌ Incorrecto**: Crear repository genérico por tabla.
- **✅ Correcto**: Repositorio por agregado donde aporta frontera transaccional.

### 08. Decir que todo CRUD necesita aggregate root y factory
- **❌ Incorrecto**: Decir que todo CRUD necesita aggregate root y factory.
- **✅ Correcto**: DDD táctico solamente donde complejidad de negocio lo justifique.

### 09. Guardar cambios de inventario sin protección concurrente
- **❌ Incorrecto**: Guardar cambios de inventario sin protección concurrente.
- **✅ Correcto**: Versionado optimista o locks según invariant y carga.

### 10. Test sólo comprueba setter público
- **❌ Incorrecto**: Test sólo comprueba setter público.
- **✅ Correcto**: Testear escenarios de negocio en lenguaje ubicuo con rechazos.


## Ejemplo implementable y revisión del riesgo
### Ejemplo de agregado que protege invariantes

```ts
// ✅ Correcto: concepto del dominio, sin ORM ni HTTP
class Order {
  private state: 'draft' | 'paid' | 'shipped' = 'draft';
  pay(): void {
    if (this.state !== 'draft') throw new Error('InvalidOrderTransition');
    this.state = 'paid';
  }
  ship(): void {
    if (this.state !== 'paid') throw new Error('OrderMustBePaid');
    this.state = 'shipped';
  }
}
// ❌ Incorrecto: controller ejecuta SQL UPDATE status='shipped' omitiendo invariantes.
```

**Comprobar:** pagar dos veces y enviar sin pago fallan; concurrencia se resuelve en persistencia con versión/lock, no solo con este objeto en memoria. Si es CRUD sin invariantes, no exigir agregado ficticio.

### Política de pruebas y optimización

**Gate de arquitectura:** casos de uso con aceptación/rechazo, pruebas de contrato y de regresión, revisión de dependencias y evidencia de cambios observables.

**Optimización:** medir coste real y complejidad de cambio; elegir primero el diseño más sencillo que conserva invariantes y extensibilidad comprobable.

**Criterio de salida:** incluir requisito, decisión arquitectónica, riesgo, tests ejecutados, métricas pertinentes y estado `PASS | FAIL | BLOCKED | NOT_RUN`. Un ejemplo documental o un script no ejecutado nunca justifican `PASS`.
