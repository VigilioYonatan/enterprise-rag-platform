# NestJS: DDD pragmático, agregados e invariantes

DDD modela **comportamiento de negocio**. En Vigilio usar `approvePolicy`, `cancelOrder`, `activateSubscription`, `calculatePremium` cuando esas acciones existan realmente, y `listProducts`/`searchProducts` para queries. No renombrar tablas arbitrariamente como verbos de negocio.

**Un schema propietario, tipos inferidos y comportamiento encapsulado en la entidad.**

> Implementación y código original en [documento propietario del ejemplo](../../../../standards/api/http-dtos-and-contracts.md). Consultar allí el bloque completo para evitar copias divergentes.


```typescript
// orders/domain/entities/order.entity.ts
import type { OrderSchema } from '../schemas/order.schema';
import { OrderAlreadyShippedError } from '../errors/order-already-shipped.error';

export class OrderEntity {
  constructor(readonly id: OrderSchema['id'], private status: OrderSchema['status']) {}

  cancel(): void {
    if (this.status === 'cancelled') return; // idempotencia SI está aprobada por negocio
    if (this.status === 'shipped') throw new OrderAlreadyShippedError();
    this.status = 'cancelled';
  }

  getStatus(): OrderSchema['status'] { return this.status; }
}
```

**Responsabilidades:** `OrderController.cancelOrder()` → `OrderService.cancelOrder()` → `OrderEntity.cancel()` → `OrderRepository.save()`. El estado se deriva como `OrderSchema['status']`, nunca se reescribe como unión literal. `OrderAlreadyShippedError` es dominio puro; el filter HTTP mapea el conflicto sin acoplar el agregado a NestJS. En sistemas concurrentes, usar transacción/lock o versión optimista, sin asumir que el `return` idempotente resuelve carreras. [Regla Zod/DTO](../../../../standards/api/http-dtos-and-contracts.md).

El error del dominio debe ser independiente de HTTP; exception filter traduce `OrderAlreadyShippedError` a código HTTP acorde al contrato. Repository retorna `OrderEntity` al escribir; consultas pueden usar read models sin reconstruir agregados si no se ejecutan invariantes.

## Caso de uso

1. Obtener contexto autorizado del caller (tenant y permisos).
2. Cargar agregado y aplicar lock o comprobación optimista de versión cuando el cambio pueda competir.
3. Ejecutar `OrderEntity.cancel()` y persistir dentro de transacción.
4. Guardar outbox en la misma transacción si se requieren integraciones fiables.
5. Tras commit, coordinar invalidación y emisión; devolver DTO de aplicación tipado.

✅ Correcto: cancelar solo cuando la transición sea válida, incluir tests de `shipped`/`cancelled` y llamadas concurrentes.

❌ Incorrecto: `service.update(id,{status:'cancelled'})` saltando validación de negocio; crear entidad vacía en un CRUD sin reglas.

[DDD universal](../../../../foundations/architecture/ddd.md), [casos de uso](../application/use-cases.md) y [ports](../application/repository-ports.md).

## Procedencia documental preservada

- [Capítulo heredado: 2-arquitectura.md](references/2-arquitectura.md) — contenido íntegro conservado.
- [Capítulo heredado: 21-golden-path-feature.md](references/21-golden-path-feature.md) — contenido íntegro conservado.

> Fuente única para **Cobertura de implementación y evidencia (ampliación)**: [abrir documento canónico](../../../../governance/complete-work-coverage-policy.md).

