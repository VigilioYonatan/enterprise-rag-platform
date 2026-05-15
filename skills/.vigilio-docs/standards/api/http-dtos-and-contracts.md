# Contratos HTTP en DTOs — norma transversal Vigilio

**Propiedad de normas:** este archivo gobierna Zod/tipos y DTOs HTTP; métodos/rutas/seguridad operativa y patrones complejos pertenecen a [Diseño REST de endpoints](rest-endpoint-design.md).

**Norma vigente (2026-10-25).** [Convenciones DDD](../engineering/naming-and-boundaries.md) · [Contratos HTTP](contracts.md) · [Ejemplo NestJS](../../stacks/backend/nestjs/http/semantic-dtos-and-pagination.md).

**Decisión:** no crear archivos `*.validator.ts` ni carpetas `validators/` para request/query/params/response en código nuevo. **Un archivo `*.dto.ts` es dueño tanto del contrato Zod como de su tipo TypeScript inferido**. El mismo objeto ejecutable valida en el borde cuando se usa desde un pipe o ApiClient; `type` no valida por sí solo. No suprimir la validación real ni duplicar `.parse()` sin justificación.

## Propietarios de los datos

| Archivo | Responsabilidad |
|---|---|
| `products/domain/schemas/product.schema.ts` | Un Zod estructural propietario `productSchema`, tipo de datos `ProductSchema` |
| `products/infrastructure/persistence/products.table.ts` | Tabla PostgreSQL/Drizzle, índices, constraints y mapping físico |
| `shared/http/dto/offset-pagination-query.dto.ts` | Zod de query + tipo `OffsetPaginationQueryDto` en el **mismo archivo** |
| `products/presentation/http/dto/list-products.query.dto.ts` | Zod derivado de paginación y entidad + tipo `ListProductsQueryDto` en el **mismo archivo** |
| `products/presentation/http/dto/list-products.response.dto.ts` | Contrato de salida Zod + `ListProductsResponseDto`; reutiliza factory compartida |
| `products/presentation/http/docs/product.response.doc.ts` | Adaptador opcional para NestJS/Swagger/Scalar; no importable por web/Expo |
| `products/application/types/product-criteria.type.ts` | Filtros/criterios de Application; no importar los DTO HTTP en Domain |

**No confundir:** Zod schema de estructura de entidad ≠ tabla SQL; HTTP DTO ≠ entidad del dominio. `ProductSchema = z.infer<typeof productSchema>` es el tipo de sus **datos**, mientras `typeof productSchema` es el tipo del validador Zod. No crear `ProductId`, `ProductStatus` ni `ProductType` si basta `ProductSchema['id']`, `ProductSchema['estado']`, `ProductSchema['product_type']`. Crear un tipo nominal/VO solamente si aporta invariantes o semántica adicional real.

## Ejemplo 1: schema propietario y enums SQL sin duplicaciones

```typescript
// products/domain/schemas/product.schema.ts
import { z } from 'zod';
export const productSchema = z.object({
  id: z.uuid(),
  tenant_id: z.uuid(),
  nro_poliza: z.string().trim().min(1).max(30),
  product_type: z.enum(['inclusion', 'exclusion']),
  estado: z.enum(['pendiente', 'procesado', 'anulado']),
});
export type ProductSchema = z.infer<typeof productSchema>;
```

```typescript
// products/infrastructure/persistence/products.table.ts
import { pgEnum, pgTable, uuid, varchar } from 'drizzle-orm/pg-core';
import { productSchema } from '../../domain/schemas/product.schema';
export const productTypeEnum = pgEnum('product_type', productSchema.shape.product_type.options);
export const productStatusEnum = pgEnum('product_status', productSchema.shape.estado.options);
export const products = pgTable('products', {
  id: uuid().primaryKey(),
  tenant_id: uuid().notNull(),
  nro_poliza: varchar({ length: 30 }).notNull(),
  product_type: productTypeEnum().notNull(),
  estado: productStatusEnum().notNull(),
});
```

En Drizzle moderno omitir el nombre SQL explícito cuando coincida con la propiedad. Los cambios al enum requieren **migración real** de PostgreSQL, OpenAPI diff y tests de compatibilidad; importar los `options` no aplica una migración automáticamente.

## Ejemplo 2: query paginada — todo en DTOs

```typescript
// shared/http/dto/offset-pagination-query.dto.ts
import { z } from 'zod';
const unsigned_query_integer = z.string()
  .regex(/^(0|[1-9]\d*)$/)
  .transform(Number)
  .pipe(z.number().int().safe().nonnegative());
export const offsetPaginationQueryDto = z.object({
  limit: unsigned_query_integer.pipe(z.number().min(1).max(100)).default(25),
  offset: unsigned_query_integer.default(0),
});
export type OffsetPaginationQueryDto = z.output<typeof offsetPaginationQueryDto>;
```

```typescript
// products/presentation/http/dto/list-products.query.dto.ts
import { z } from 'zod';
import { productSchema } from '../../../domain/schemas/product.schema';
import { offsetPaginationQueryDto } from '@/shared/http/dto/offset-pagination-query.dto';
export const listProductsQueryDto = offsetPaginationQueryDto.extend({
  estado: productSchema.shape.estado.optional(),
});
export type ListProductsQueryDto = z.output<typeof listProductsQueryDto>;
```

El DTO contiene el objeto Zod y el tipo inferido, pero la ejecución sigue a cargo del pipe de NestJS o ApiClient. `z.input<typeof ...>` representa valores de entrada sin transformar; `z.output<typeof ...>` representa valores ya validados/transformados. Probar `''`, negativos, exponentes, límites, arrays y repetición de parámetros; no aceptar formatos inseguros por coerción laxa.

## Ejemplo 3: paginador y response DTO DRY

```typescript
// shared/http/dto/paginator.dto.ts
import { z } from 'zod';
export const paginatorMetaDto = z.object({
  count: z.number().int().nonnegative(),
  next: z.string().nullable(),
  previous: z.string().nullable(),
});
export const createPaginatorDto = <T extends z.ZodType>(item_schema: T) =>
  paginatorMetaDto.extend({ results: z.array(item_schema) });
```

```typescript
// products/presentation/http/dto/list-products.response.dto.ts
import { z } from 'zod';
import { createPaginatorDto } from '@/shared/http/dto/paginator.dto';
import { productSchema } from '../../../domain/schemas/product.schema';
export const listProductsResponseDto = createPaginatorDto(
  productSchema.pick({ id: true, nro_poliza: true, product_type: true }),
);
export type ListProductsResponseDto = z.output<typeof listProductsResponseDto>;
```

El repositorio devuelve `PageResult<ProductSummary>` o un read model propio de Application; el Presenter aplica la proyección HTTP explícita. El retorno público de Vigilio es `{count,next,previous,results}`. El `pick()` de Zod valida/proyecta cuando se **ejecuta**, no porque TypeScript anote el valor.

## Ejemplo 4: request de usuario sin schema HTTP paralelo

```typescript
// users/presentation/http/dto/register-user.request.dto.ts
import { z } from 'zod';
import { userSchema } from '../../../domain/schemas/user.schema';
export const registerUserRequestDto = userSchema
  .pick({ email: true, name: true })
  .extend({ password: z.string().min(12) });
export type RegisterUserRequestDto = z.output<typeof registerUserRequestDto>;
```

`registerUserRequestDocDto` o `RegisterUserRequestDocDto` en `docs/` es opcional si una librería necesita una clase `createZodDto(registerUserRequestDto)`. No compartir ese adaptador NestJS con web/Expo. Contratos de request/response y defaults son responsabilidad del mismo DTO, sin duplicar los campos base del usuario.

## Ejemplo 5: DDD y tipos indexados sin alias vacíos

```typescript
// orders/domain/schemas/order.schema.ts
import { z } from 'zod';
export const orderSchema = z.object({
  id: z.uuid(),
  status: z.enum(['pending', 'cancelled', 'shipped']),
});
export type OrderSchema = z.infer<typeof orderSchema>;
```

```typescript
// orders/domain/entities/order.entity.ts
import type { OrderSchema } from '../schemas/order.schema';
export class OrderEntity {
  constructor(readonly id: OrderSchema['id'], private status: OrderSchema['status']) {}
  cancel(): void {
    if (this.status === 'cancelled') return; // únicamente si idempotencia aprobada por negocio
    if (this.status === 'shipped') throw new OrderAlreadyShippedError();
    this.status = 'cancelled';
  }
  getStatus(): OrderSchema['status'] { return this.status; }
}
```

Controller `cancelOrder()` → Application `cancelOrder()` → Domain `cancel()` → Repository `save()`. La concurrencia requiere transacción, lock o versión optimista según el caso; un `return` idempotente no evita carreras.

## Ejemplo 6: Cero `| string`, cero `Partial<Omit<...>>` redundantes, cero alias `export const a = b` y cero Query DTOs duplicados

```typescript
// ❌ INCORRECTO (Cómo NO debe ser):
// 1. Duplicar un schema existente con otro nombre:
export const chatAnswerSchema = answerResultSchema;
export type ChatAnswerSchema = AnswerResultSchema;

// 2. Duplicar Query DTOs con la misma estructura en el mismo módulo:
export const listAgentsQuery = z.object({ organization_id: z.string().uuid() });
export const agentDetailQuery = z.object({ organization_id: z.string().uuid() });

// 3. Debilitar el tipo indexado con `| string` o usar `Partial<Omit<...>>` redundante:
export interface ApprovalFilter {
  status: ApprovalSchema['status'] | string; // ❌ Convierte el enum en cualquier string
}
export type ApprovalRecord = Pick<
  ApprovalSchema,
  'id' | 'organization_id' | 'run_id' | 'requested_by' | 'status' | 'expires_at' | 'reason'
> &
  Partial<
    Omit<
      ApprovalSchema,
      'id' | 'organization_id' | 'run_id' | 'requested_by' | 'status' | 'expires_at' | 'reason'
    >
  >;
```

```typescript
// ✅ CORRECTO (Cómo debe ser):
// 1. Usar directamente `answerResultSchema` y `AnswerResultSchema` sin crear alias.

// 2. Un único Query DTO canónico reutilizable por operación equivalente del módulo:
export const agentQueryDto = z.object({
  organization_id: z.string().uuid(),
});
export type AgentQueryDto = z.infer<typeof agentQueryDto>;

// 3. Tipos indexados estrictos (`Schema['campo']`) y `Partial<Pick<...>>` explícito:
export interface ApprovalFilter {
  status: ApprovalSchema['status']; // ✅ Solo acepta 'pending' | 'approved' | 'rejected' | 'expired'
}
export type ApprovalRecord = Pick<
  ApprovalSchema,
  'id' | 'organization_id' | 'run_id' | 'requested_by' | 'status' | 'expires_at' | 'reason'
> &
  Partial<Pick<ApprovalSchema, 'decided_by' | 'decided_at' | 'created_at'>>;
```

## Por stack y compatibilidad

- **NestJS:** Zod y tipo están en un `.dto.ts`, se valida mediante Pipe real y se adapta a Swagger/Scalar si hace falta. DI del constructor: `productRepository` (`camelCase`); parámetros ordinarios: `product_id` (`snake_case`).
- **React/Expo:** importar DTO browser-safe desde paquete de contratos; `useListProductsQuery()` y `listProductsApi()` semánticos, propiedades externas `queryKey`/`mutationFn` intactas. No importar clases `@nestjs/*`.
- **Angular:** servicio HTTP por DI y estado reactivo separado; reutilizar DTO sin imponer carpetas React.
- **Laravel:** Spatie Data puede combinar tipado y validación de entrada; FormRequest solo si agrega valor real. Eloquent y migraciones son dueños de SQL; enums PHP son necesarios y **no** equivalen a alias TypeScript vacíos.
- **Compatibilidad:** si un paquete publicado usa `*Validator`, conservar alias temporal/versionado y migrar consumidores con typecheck y OpenAPI diff. El renombre en documentación **no demuestra** que los exports ya existen en el paquete público.

**✅ Correcto:** un DTO por contrato HTTP con Zod y tipo en el mismo archivo; usar `ProductSchema['id']` inline; valores `pgEnum()` derivados del schema propietario, con migración de PostgreSQL controlada.

**❌ Incorrecto:** crear dos archivos HTTP `*.validator.ts` y `*.dto.ts` que se importan mutuamente o duplican reglas, copiar `type ProductStatus = 'pendiente' | ...`, crear aliases indexados sin semántica, declarar que `as Dto` valida JSON o serializar filas ORM completas.

**QA:** Docs/Skills y snapshot npm son documentación; tests reales de NestJS, Laravel y PostgreSQL requieren aplicaciones consumidoras y se registran `NOT_RUN` cuando no se ejecutan.

## Compatibilidad de contratos publicados y migración de consumidores

Los nombres `ListProductsQueryDto`, `ListProductsResponseDto`, `listProductsResponseDto`, `RegisterProductRequestDto` y `registerProductRequestDto` son **convención de destino**, no pruebas de exports ya publicados. El backend owner debe publicar schemas Zod y tipos en `*.dto.ts` con versión compatible; los consumidores deben confirmar sus exports mediante typecheck y contract tests, antes de migrar API clients, hooks, query keys e invalidación. Un adaptador temporal de alias requiere fecha de retiro y pruebas; nunca duplicar schemas ni lógica del dominio.

El nombre del método `listProductsApi()` no implica cambiar la ruta REST `GET /products`; un `index.ts` barrel o `array[index]` no es un caso de uso CRUD. Un renombre público de `index/store` exige migración coordinada, no búsqueda global.

✅ **Correcto:** publicar `registerProductRequestDto` y después actualizar la importación del formulario; pasar `z.input` para valores crudos y `z.output` para valores transformados si el formulario usa coerción.

❌ **Incorrecto:** importar `RegisterProductRequestDto` de un paquete que todavía no lo exporta o copiar un DTO de backend dentro de Expo/React.
