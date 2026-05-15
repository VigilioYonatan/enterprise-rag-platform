# Golden Path de Feature - `bus-impl`

Esta guía recoge el flujo histórico de `bus-impl`. Para desarrollo vigente, aplicar los nombres semánticos y DTOs/schemas separados del estándar de Vigilio.

```text
schema Zod -> request/response DTO -> controller -> service -> repository port -> Drizzle repository
```

## Regla principal

Para CRUD simple no crear `domain/entities`. La entity de dominio solo existe si hay comportamiento real como transiciones de estado, reglas complejas, eventos de dominio o invariantes que no son solo validacion de entrada.

## Estructura por feature

```text
src/product/
|-- application/
|   |-- constants/
|   |   `-- product-limits.constant.ts
|   |-- schemas/
|   |   `-- product.schema.ts
|   |-- dtos/
|   |   |-- list-products.request.dto.ts
|   |   |-- list-products.response.dto.ts
|   |   |-- register-product.request.dto.ts
|   |   |-- register-product.response.dto.ts
|   |   |-- change-product-details.request.dto.ts
|   |   `-- change-product-details.response.dto.ts
|   |-- repositories/
|   |   |-- product.repository.interface.ts
|   |   `-- product.repository.token.ts
|   |-- service/
|   |   `-- product.application-service.ts
|   `-- types/
|       `-- product-filter.type.ts
`-- infrastructure/
    |-- http/
    |   |-- controllers/
    |   |   `-- product.controller.ts
    |   `-- dtos/ # contratos puros *.dto.ts y adaptadores Nest/OpenAPI *.doc.ts
    `-- persistence/
        `-- drizzle/
            |-- schema.ts
            `-- product.repository.ts
```

## Convenciones obligatorias

- ✅ Controllers y Application Services usan capacidades semánticas también para operaciones sencillas: `listProducts`, `getProduct`, `registerProduct`, `changeProductDetails`, `removeProduct` (cuando exista eliminación real). ❌ No imponer `index/show/store/update/destroy` como estándar nuevo.
- Para casos de uso de negocio, utilizar lenguaje ubicuo explicito: `approvePolicy()`,
  `cancelOrder()`, `activateSubscription()`, `calculatePremium()` (si son operaciones reales).
  No esconder decisiones de negocio detras de `update()` ni obligar nombres CRUD en el dominio.
- `operationId` nuevo debe ser único y semántico (`listProducts`, `registerProduct`, `cancelOrder`). Si ya se publicó un ID anterior, conservar compatibilidad durante la migración controlada; no renombrarlo silenciosamente.
  Cambiar un `operationId` publicado requiere revision de compatibilidad OpenAPI y consumidores.
- Request DTO: `register-product.request.dto.ts`, `change-product-details.request.dto.ts`, `list-products.request.dto.ts`.
- Response DTO: `list-products.response.dto.ts`, `register-product.response.dto.ts`.
- Doc DTO Swagger: vive en el archivo hermano `*.request.doc.ts` o `*.response.doc.ts` cuando hace falta.
- Services y controllers retornan `ResponseDto`, no filas crudas de Drizzle.
- Drizzle vive solo en `infrastructure/persistence/drizzle`.
- El repository port vive en `application/repositories`.
- Los tipos propios viven en `types/` dentro de su feature y capa.
- Las constantes propias viven en `constants/` dentro de su feature y capa.
- Controllers y services no declaran tipos o constantes arriba de la clase.
- Los tipos Zod inferidos permanecen junto al schema propietario.
- Evitar barrels globales `types/index.ts` y `constants/index.ts`; importar desde el owner concreto.

✅ Correcto:```ts
// application/types/product-filter.type.ts
export type ProductFilter = { status?: ProductSchema['estado'] };

// application/constants/product-limits.constant.ts
export const PRODUCT_PAGE_LIMIT = 100;
```

❌ Incorrecto:```ts
type ProductFilter = { status?: string };
const LIMIT = 100;
export class ProductController {}
```

## Cuando si usar `domain/`

Usar `domain/` cuando la feature tenga:

- estados con transiciones reales, por ejemplo `aprobar`, `anular`, `rechazar`
- invariantes que deben cumplirse aunque cambie HTTP, worker o DB
- eventos de dominio antes del outbox
- politicas de negocio reutilizadas por varios casos de uso

Si no existen invariantes, mantener el diseño sencillo **con métodos semánticos** (`listProducts`, `registerProduct`) y sin agregado ceremonial.

## Checklist 10/10 antes del PR

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test:coverage`
- `pnpm openapi:export`
- `pnpm openapi:diff`
- DTOs derivados de schemas con `pick`, `omit`, `partial` o `extend`
- Query validada con `ZodQueryPipe`
- Body validado con `ZodPipe`
- OpenAPI/Scalar actualizado
- Repository testeado con PostgreSQL real si toca Drizzle
- Sin secretos, `any`, imports relativos largos ni log de payload sensible

## Variante DDD con lenguaje ubicuo (obligatoria en nuevos casos de uso)

`cancelOrder()` representa una transicion de negocio, no un CRUD `update()`:

```typescript
// domain/order.aggregate.ts (OrderData derivado de orderSchema, en su archivo propietario)
export class Order {
  constructor(readonly id: OrderData['id'], private status: OrderData['status']) {}

  cancel(): void {
    if (this.status === 'shipped') throw new OrderAlreadyShippedError(this.id);
    if (this.status === 'cancelled') return; // idempotencia definida por producto
    this.status = 'cancelled';
  }

  getStatus(): OrderData['status'] { return this.status; }
}
```

```typescript
// application/repositories/order.repository.interface.ts
export interface OrderRepository {
  findById(order_id: OrderData['id']): Promise<Order | null>;
  save(order: Order): Promise<void>; // adapter Drizzle; no ResponseDto HTTP
}

// application/service/cancel-order.application-service.ts
export class CancelOrderApplicationService {
  constructor(private readonly orders: OrderRepository) {}

  async cancelOrder(order_id: OrderData['id']): Promise<OrderCancelResponseDto> {
    const order = await this.orders.findById(order_id);
    if (!order) throw new OrderNotFoundError(order_id);
    order.cancel();
    await this.orders.save(order); // transaccion/concurrencia segun invariantes
    return { order_id: order.id, status: order.getStatus() };
  }
}
```

`OrderCancelResponseDto` se deriva con Zod del schema propietario en `*.response.dto.ts`;
el controller HTTP lo retorna tipado, y el `*.response.doc.ts` lo documenta en Scalar.
Para modificacion concurrente usar versionado optimista/lock en Drizzle y constraints de DB:
`findById -> save` sin control de concurrencia no basta en estados criticos.
Un command de dominio puede compartir un contrato Zod con el frontend sin hacer que el
repository devuelva el DTO HTTP. No crear `domain/` para un CRUD sin invariantes.

> Fuente única para **Correcto / Incorrecto: revisión 2026**: [abrir documento canónico](../../../../../governance/documentation-dry-and-ownership.md).

