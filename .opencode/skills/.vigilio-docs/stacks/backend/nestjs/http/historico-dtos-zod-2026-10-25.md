# NestJS: Zod 4, schemas, DTO request/response y serialización

> **Convención vigente HTTP:** schemas base solo para entidades; entradas/salidas HTTP en `*.validator.ts`; DTO `*.dto.ts` solo tipos; adaptador `*.doc.ts` opcional NestJS. [Fuente normativa](../../../../standards/api/http-validators-and-dtos.md). No asumir exports publicados renombrados sin migración.


> **Referencia canónica actualizada:** [DTOs semánticos, query y paginador DRY](semantic-dtos-and-pagination.md) · [tipos de schema](../architecture/schema-derived-types.md) y [validadores de entrada HTTP](../../../../standards/api/http-validators-and-dtos.md). Los fragmentos anteriores conservados tienen valor de procedencia; adoptar esta guía para nuevos cambios.

## Fuente canónica sin duplicación

```typescript
// products/domain/schemas/product.schema.ts — SOLO el modelo propietario
import { z } from 'zod';
export const productSchema = z.object({
  id: z.number().int().positive(),
  nro_poliza: z.string().min(1).max(30),
  product_type: z.enum(['inclusion', 'exclusion']),
  estado: z.enum(['pendiente', 'procesado', 'anulado']),
});
export type ProductSchema = z.infer<typeof productSchema>;
```

```typescript
// products/presentation/http/validators/list-products.response.validator.ts
import { productSchema } from '../../../domain/schemas/product.schema';
import { createPaginatorValidator } from '@/shared/http/validators/paginator.validator';
export const listProductsResponseValidator = createPaginatorValidator(
  productSchema.pick({ id: true, nro_poliza: true, product_type: true }),
);
```

```typescript
// products/presentation/http/dto/list-products.response.dto.ts — SOLO tipo derivado
import type { z } from 'zod';
import { listProductsResponseValidator } from '../validators/list-products.response.validator';
export type ListProductsResponseDto = z.infer<typeof listProductsResponseValidator>;
```

`createPaginatorValidator` es la factory **existente en Vigilio**, no una función incluida de serie en Zod: importarla desde el módulo compartido del consumidor. `*.request.validator.ts` y `*.query.validator.ts` definen validación Zod de entrada; `*.response.validator.ts` define el contrato Zod de salida; `*.dto.ts` exporta únicamente tipos derivados; `*.doc.ts` actúa como adaptador OpenAPI si se usa `nestjs-zod`.

## Query string y coerce seguro

```typescript
// products/presentation/http/validators/list-products.query.validator.ts
export const listProductsQueryValidator = offsetPaginationQueryValidator.extend({
  estado: productSchema.shape.estado.optional(),
});
// products/presentation/http/dto/list-products.query.dto.ts
export type ListProductsQueryDto = z.output<typeof listProductsQueryValidator>;
// Query pipe: llamar a listProductsQueryValidator.parse(value), no reconvertir números
```

El schema compartido `offsetPaginationQueryValidator` rechaza `''` por defecto; validar/preprocesar explícitamente si vacío debe rechazarse. Usar `z.input` antes del parse, `z.output` después; no declarar que `@Query()` siempre llega number por su anotación TypeScript.

## Salida y OpenAPI

El caso de uso puede retornar `Promise<ListProductsResponseDto>` sin `.parse()` por cada respuesta si esa es la política. Eso es tipado, **no validación runtime**: el controller/presenter construye proyección explícita y las pruebas de contrato verifican JSON. `z.infer` no sanea una fila de DB, y `Date` de dominio se debe convertir a ISO string.

✅ Correcto: `.pick()`/`.omit()` sobre schema propietario, paginador genérico, tests de entrada inválida y campos de salida.

❌ Incorrecto: hardcodear el mismo objeto en cuatro DTOs, `as T` como prueba de JSON o `@ZodResponse` sin intención de validación/serialización runtime.

[Contratos transversales](../../../../standards/api/contracts.md) y [documentación pública](swagger-scalar.md).

## Procedencia documental preservada

- [Capítulo heredado: 6-ejemplos-codigo.md](references/6-ejemplos-codigo.md) — contenido íntegro conservado.
- [Capítulo heredado: 27-dtos-request-response.md](references/27-dtos-request-response.md) — contenido íntegro conservado.
- [Capítulo heredado: 46-zod-query-ddd-versiones-2026.md](references/46-zod-query-ddd-versiones-2026.md) — contenido íntegro conservado.

## Mejoras técnicas verificables — 2026

**13. DTO único derivado.** ✅ `createPaginatorValidator(productSchema.pick({id:true,nro_poliza:true,product_type:true}))` en `list-products.response.validator.ts` y tipo derivado en `list-products.response.dto.ts`; query con `z.coerce` restringido y tipo `z.output`. ❌ Copiar `z.object()` por cada endpoint, convertir de number a string tras Zod o ejecutar `.parse()` en salida solo para tipar.
