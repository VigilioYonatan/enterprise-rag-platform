# Validadores HTTP, DTOs y modelos de datos — norma transversal Vigilio

**Decisión de arquitectura (2026-10-25).** [Convenciones y fronteras](../engineering/naming-and-boundaries.md) · [contratos HTTP](contracts.md) · [NestJS: ejemplo completo](../../stacks/backend/nestjs/http/semantic-dtos-and-pagination.md). Esta es la regla normativa; stacks y skills enlazan aquí sin copiar definiciones.

## Responsabilidad y nombre de archivo

| Responsabilidad | Carpeta/archivo | Contiene | Nunca contiene |
|---|---|---|---|
| Modelo estructurado propio de entidad | `products/domain/schemas/product.schema.ts` | `productSchema` Zod, `type ProductSchema = z.infer<typeof productSchema>` | `listProductsQueryValidator`, DTO HTTP o tablas SQL |
| Persistencia relacional | `products/infrastructure/persistence/products.table.ts` | Definición Drizzle/SQL, índices y constraints | DTO HTTP, reglas de presentación |
| Validador HTTP compartido de entrada | `shared/http/validators/offset-pagination-query.validator.ts` | Validación y conversión Zod de query/params/body | Schema de tabla PostgreSQL |
| Tipo de entrada compartido | `shared/http/dto/offset-pagination-query.dto.ts` | Solo `type OffsetPaginationQueryDto = z.output<typeof offsetPaginationQueryValidator>` | `z.object()`, `.extend()` o validación runtime |
| Validador HTTP específico | `products/presentation/http/validators/list-products.query.validator.ts` | Extensión de validadores HTTP con campos de Product | Schema de entidad nuevo o DTO anónimo |
| DTO HTTP específico | `products/presentation/http/dto/list-products.query.dto.ts` | `type ListProductsQueryDto = z.output<typeof listProductsQueryValidator>` | Otro schema, campos manuales |
| Validador de **salida** | `products/presentation/http/validators/list-products.response.validator.ts` | Proyección Zod desde `productSchema.pick(...)` y paginador genérico | Tablas SQL, reglas de dominio |
| DTO de salida | `products/presentation/http/dto/list-products.response.dto.ts` | `type ListProductsResponseDto = z.output<typeof listProductsResponseValidator>` | Schema Zod nuevo o repetición de campos |
| Criterios de Application | `products/application/types/product-criteria.type.ts` | Tipo propio para filtros autorizados, paginación y orden | DTO HTTP y decorators |

**`schema` no significa necesariamente tabla SQL.** Aquí Zod define estructuras de datos; Drizzle define tablas. Usamos `*.validator.ts` para **entradas HTTP** por claridad; `*.response.validator.ts` declara el **validador del contrato de salida** y alimenta OpenAPI si procede. Esto es una decisión de nombres del proyecto, no una limitación de Zod. No crear ni duplicar un schema de respuesta por cada acción si retorna la misma forma. Los tipos `*Schema` son datos inferidos de Zod, no su objeto validador: `typeof productSchema` es el tipo de ese objeto.

## Ejemplo obligatorio de paginación HTTP robusta

```typescript
// shared/http/validators/offset-pagination-query.validator.ts
import { z } from 'zod';
const unsigned_query_integer = z.string()
  .regex(/^(0|[1-9]\d*)$/, 'Entero decimal sin signo')
  .transform(Number)
  .pipe(z.number().int().safe().nonnegative());

export const offsetPaginationQueryValidator = z.object({
  limit: unsigned_query_integer.pipe(z.number().min(1).max(100)).default(25),
  offset: unsigned_query_integer.default(0),
});
```

```typescript
// shared/http/dto/offset-pagination-query.dto.ts
import type { z } from 'zod';
import { offsetPaginationQueryValidator } from '../validators/offset-pagination-query.validator';
export type OffsetPaginationQueryDto = z.output<typeof offsetPaginationQueryValidator>;
```

```typescript
// products/presentation/http/validators/list-products.query.validator.ts
import { offsetPaginationQueryValidator } from '@/shared/http/validators/offset-pagination-query.validator';
import { productSchema } from '../../../domain/schemas/product.schema';
export const listProductsQueryValidator = offsetPaginationQueryValidator.extend({
  estado: productSchema.shape.estado.optional(),
});
```

```typescript
// products/presentation/http/dto/list-products.query.dto.ts
import type { z } from 'zod';
import { listProductsQueryValidator } from '../validators/list-products.query.validator';
export type ListProductsQueryDto = z.output<typeof listProductsQueryValidator>;
```

`z.input<typeof ...>` describe *wire input* antes del parse; `z.output<typeof ...>` representa los datos ya transformados. `?limit=25` llega como texto; después del pipe es número. **Rechazar** `?limit=`, negativos, exponentes, flotantes, enteros inseguros y valores mayores a `100`. Si el framework entrega una forma no string, adaptarlo explícitamente: jamás asumir que el tipo TS ejecuta validación. `z.coerce.number()` a secas convierte `''` en `0`; por eso usamos precondición léxica. No parsear el mismo input dos veces sin necesidad.

## Fronteras y DDD

1. `productSchema`/`orderSchema`/`categorySchema` son cada uno propietarios de sus campos de entidad. **Tipos:** `ProductSchema`, `OrderSchema`, `CategorySchema` y subtipos con acceso indexado `OrderSchema['status']`/`ProductSchema['id']`; no uniones literales repetidas.
2. El controller recibe el `*QueryDto` **validado** y adapta un `ProductCriteria` interno con tenant/contexto autorizado. Application/Domain **no importan DTOs HTTP**.
3. Los validadores de salida se componen con `.pick()`, `.omit()`, `.extend()` solo cuando se necesita un contrato runtime; tipos internos se componen con `Pick<>`, `Omit<>`, intersecciones, sin otro schema por comodidad.
4. `PageResult<T>` se declara una vez en Shared/Application; `{count,next,previous,results}` es el contrato de paginación. No `Promise<{items,total,...}>` anónimo; para cursor real, contrato distinto si cambia semántica.
5. Cada cambio de export de paquete HTTP tiene migración coordinada y OpenAPI diff. Mantener símbolos publicados mientras se migra; no reescribir métodos de terceros ni artefactos históricos. Laravel puede usar FormRequest/Spatie Data sin fingir tener `z.infer` en PHP.

## Aceptación: ✅ correcto / ❌ incorrecto

- ✅ `list-products.query.validator.ts` contiene Zod para la URL; `list-products.query.dto.ts` solo `z.output`.
- ✅ `order.schema.ts` declara `z.enum`; `type OrderStatus = OrderSchema['status']`; `OrderEntity.cancel()` aplica idempotencia si la regla lo permite.
- ✅ Constructor DI `productRepository`; parámetro normal `product_id`; método `cancelOrder()` en Application y `cancel()` en Domain.
- ❌ `listProductsQueryValidator` dentro de `product.schema.ts`, o un `z.object()` dentro de `*.dto.ts`.
- ❌ `OrderStatus = 'pending' | 'cancelled' | 'shipped'` replicando el enum base.
- ❌ Reusar `ListProductsQueryDto` como dependencia de un Repository Port o Application Service.
- **Pruebas:** query válida e inválida, Zod input/output, invariantes repetidas/estado enviado/concurrencia, allowlist de salida, OpenAPI diff, consumo web/móvil. Estos fragmentos son documentación: estado de compilación del proyecto consumidor `NOT_RUN` hasta evidenciarla.


## Registro de User: contrato HTTP de formulario, sin DTO dentro del schema base

```typescript
// user/domain/schemas/user.schema.ts — propietaria de los atributos de User
export const userSchema = z.object({
  id: z.uuid(),
  email: z.email(),
  name: z.string().trim().min(1),
});
export type UserSchema = z.infer<typeof userSchema>;
```

```typescript
// user/presentation/http/validators/register-user.request.validator.ts
import { z } from 'zod';
import { userSchema } from '../../../domain/schemas/user.schema';
export const registerUserRequestValidator = userSchema.pick({
  email: true,
  name: true,
}).extend({ password: z.string().min(12) });
```

```typescript
// user/presentation/http/dto/register-user.request.dto.ts
import type { z } from 'zod';
import { registerUserRequestValidator } from '../validators/register-user.request.validator';
export type RegisterUserRequestDto = z.output<typeof registerUserRequestValidator>;
```

```typescript
// user/presentation/http/docs/register-user.request.doc.ts — SOLO NestJS (opcional)
import { createZodDto } from 'nestjs-zod';
import { registerUserRequestValidator } from '../validators/register-user.request.validator';
export class RegisterUserRequestDocDto extends createZodDto(registerUserRequestValidator) {}
```

`*.doc.ts` no debe exportarse al paquete browser-safe; cuando la integración de OpenAPI elegida documenta directamente Zod, esta clase NO es obligatoria. Usar **un único mecanismo de validación** HTTP configurado en el proyecto. El DTO de Presentation no se importa en Application ni Domain; el controller lo convierte a un comando. Si se cambian exports públicos `*Schema` a `*Validator`, conservar aliases versionados durante la migración y probar React/Expo.

## Respuestas HTTP y reutilización

```typescript
// shared/http/validators/paginator.validator.ts
export const paginatorMetaValidator = z.object({
  count: z.number().int().nonnegative(),
  next: z.string().nullable(),
  previous: z.string().nullable(),
});
export const createPaginatorValidator = <T extends z.ZodType>(item_schema: T) =>
  paginatorMetaValidator.extend({ results: z.array(item_schema) });
```

```typescript
// products/presentation/http/validators/list-products.response.validator.ts
export const listProductsResponseValidator = createPaginatorValidator(
  productSchema.pick({ id: true, nro_poliza: true, product_type: true }),
);
// products/presentation/http/dto/list-products.response.dto.ts
export type ListProductsResponseDto = z.output<typeof listProductsResponseValidator>;
```

Esto es un **validador Zod del JSON HTTP**, no un schema de tabla. `PageResult<ProductSummary>` del Repository Port es un tipo interno compartido: no debe importar validadores de Presentation. Las propiedades públicas son `count`, `next`, `previous`, `results`; no insertar manualmente un retorno anónimo en el método.

## Laravel, web, mobile y Angular

- **Laravel**: `FormRequest` o `Spatie Data` posee la validación/DTO HTTP; no existe `z.infer` en PHP. `Eloquent`/migrations son persistencia; dominio mantiene backed enums, entidades e invariantes. Evitar validar lo mismo dos veces sin justificación.
- **React/Expo**: formulario RHF y hooks consumen el `registerUserRequestValidator` y `RegisterUserRequestDto` publicados desde el paquete browser-safe. No importan `.doc.ts`, `@nestjs/*` ni duplican validators manuales. Usar `z.input` para valores brutos del formulario y `z.output` para payload validado cuando haya transformaciones.
- **Angular**: un `ApiService` con `HttpClient` puede validar respuesta en el borde; servicios de estado (`Signals`/RxJS) separados. No copiar validadores ni reglas del backend al servicio si ya existe paquete de contratos compartido.
- **Compatibilidad**: renombrar archivos del *código documentado* NO garantiza que el package publicado tenga nuevos exports; exigir migración versionada, compilación de consumidores y diff OpenAPI.
