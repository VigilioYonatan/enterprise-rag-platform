# NestJS — DTOs Zod 4 (request, query, response)

**Convención vigente:** un único archivo `.dto.ts` contiene `const ...Dto` (Zod de runtime) y `type ...Dto = z.output<typeof ...Dto>`. [Norma canónica](../../../../standards/api/http-dtos-and-contracts.md) · [Ejemplo completo](semantic-dtos-and-pagination.md). Se conserva la [versión histórica](historico-dtos-zod-2026-10-25.md).

```typescript
// products/domain/schemas/product.schema.ts
import { z } from 'zod';
export const productSchema = z.object({
  id: z.uuid(),
  nro_poliza: z.string().min(1).max(30),
  product_type: z.enum(['inclusion','exclusion']),
  estado: z.enum(['pendiente','procesado','anulado']),
});
export type ProductSchema = z.infer<typeof productSchema>;
```

```typescript
// products/presentation/http/dto/list-products.response.dto.ts
import { z } from 'zod';
import { productSchema } from '../../../domain/schemas/product.schema';
import { createPaginatorDto } from '@/shared/http/dto/paginator.dto';
export const listProductsResponseDto = createPaginatorDto(
  productSchema.pick({ id: true, nro_poliza: true, product_type: true }),
);
export type ListProductsResponseDto = z.output<typeof listProductsResponseDto>;
```

> Implementación y código original en [documento propietario del ejemplo](../../../../standards/api/http-dtos-and-contracts.md). Consultar allí el bloque completo para evitar copias divergentes.


- **Correcto:** compartir paginator desde `shared/http/dto/paginator.dto.ts`, validar entrada con Pipe real, tipos derivados sin duplicar campos, proyección allowlist en el Presenter. `z.input` representa input bruto y `z.output` el transformado.
- **Incorrecto:** crear `.validator.ts` separado, importar tipos de HTTP en Domain, usar `as Dto` como validación runtime, o crear `ProductId = ProductSchema['id']` sin valor semántico.
- **Nombres y DI:** `listProducts()`, `registerProduct()`, `productRepository` en constructor, `product_id` argumento ordinario. Conservar `operationId` público durante migraciones compatibles.

Los cambios de tipos de enum Zod no ejecutan migraciones SQL ni aseguran que Swagger/Scalar sea compatible con el transform de query; probar con versiones fijadas del proyecto consumidor. **Tests ejecutados aquí:** `NOT_RUN` fuera de validación documental.

✅ **Correcto:** ejecutar el parse una vez en el borde HTTP, proteger campos en Presenter y compartir `ProductSchema` por índices.

❌ **Incorrecto:** publicar `.validator.ts` aparte de cada `.dto.ts` o afirmar que el DTO tipado valida sin ejecutar Zod.
