# NestJS — DTO semántico, paginadores DRY, controller y response

> **Convención vigente HTTP:** schemas base solo para entidades; entradas/salidas HTTP en `*.dto.ts`; DTO `*.dto.ts` con Zod y tipo inferido en el mismo archivo; adaptador `*.doc.ts` opcional NestJS. [Fuente normativa](../../../../standards/api/http-dtos-and-contracts.md). No asumir exports publicados renombrados sin migración.


[Contrato transversal](../../../../standards/api/contracts.md), [nombres y DDD](../../../../standards/engineering/naming-and-boundaries.md), [schemas](../architecture/schema-derived-types.md), [DTOs HTTP con Zod incorporado](../../../../standards/api/http-dtos-and-contracts.md). **Nunca** imponer `index/show/store/update/destroy` para casos de uso nuevos.

## 1. Paginación reutilizable en **un solo DTO por contrato**

```typescript
// shared/http/dto/offset-pagination-query.dto.ts
import { z } from 'zod';
const unsigned_query_integer = z.string().regex(/^(0|[1-9]\d*)$/)
  .transform(Number).pipe(z.number().int().safe().nonnegative());
const page_size = unsigned_query_integer.pipe(z.number().min(1).max(100));
export const offsetPaginationQueryDto = z.object({
  limit: page_size.default(25),
  offset: unsigned_query_integer.default(0),
});
export type OffsetPaginationQueryDto = z.output<typeof offsetPaginationQueryDto>;
```

```typescript
// products/presentation/http/dto/list-products.query.dto.ts
import { z } from 'zod';
import { offsetPaginationQueryDto } from '@/shared/http/dto/offset-pagination-query.dto';
import { productSchema } from '../../../domain/schemas/product.schema';
export const listProductsQueryDto = offsetPaginationQueryDto.extend({
  estado: productSchema.shape.estado.optional(),
  search: z.string().trim().max(120).optional(),
  sort_by: z.enum(['created_at', 'id', 'nro_poliza']).default('created_at'),
  sort_dir: z.enum(['asc', 'desc']).default('desc'),
});
export type ListProductsQueryDto = z.output<typeof listProductsQueryDto>;
```

HTTP `query` llega como texto; la validación Zod se ejecuta **en el Pipe/ApiClient**, no por el tipo TS. Rechazar entradas vacías, negativas o exponenciales y probar orden estable con desempate `id`. No crear carpeta HTTP `validators/`.

## 2. Paginador de respuesta DRY y DTO de salida

> Implementación y código original en [documento propietario del ejemplo](../../../../standards/api/http-dtos-and-contracts.md). Consultar allí el bloque completo para evitar copias divergentes.


```typescript
// products/presentation/http/dto/product.response.dto.ts
import { z } from 'zod';
import { productSchema } from '../../../domain/schemas/product.schema';
export const productResponseDto = productSchema.pick({
  id: true,
  nro_poliza: true,
  product_type: true,
});
export type ProductResponseDto = z.output<typeof productResponseDto>;
```

```typescript
// products/presentation/http/dto/list-products.response.dto.ts
import { z } from 'zod';
import { productResponseDto } from './product.response.dto';
import { createPaginatorDto } from '@/shared/http/dto/paginator.dto';
export const listProductsResponseDto = createPaginatorDto(productResponseDto);
export type ListProductsResponseDto = z.output<typeof listProductsResponseDto>;
```

Un único objeto Zod y un tipo derivado por DTO, sin tipos hardcodeados. `getProduct()` y `registerProduct()` reutilizan `ProductResponseDto` si exponen el mismo contrato. La proyección pública filtra explícitamente campos; `ProductSchema` se reserva para datos de la entidad. La fábrica es código propio de Vigilio, no una función incorporada a Zod. Los exports publicados con nombres antiguos deben migrarse de forma compatible.

**Convención DI:** los campos inyectados en `constructor(private readonly ...)` se llaman `productRepository` y `productService`; `product_id` sigue `snake_case` como argumento normal. [Convención](../../../../standards/engineering/naming-and-boundaries.md).

## 3. Controller -> Application -> Domain -> Repository

```typescript
@Injectable()
export class ProductService {
  constructor(private readonly productRepository: ProductRepository) {}
  async getProduct(product_id: ProductSchema['id']): Promise<ProductSchema> {
    const product = await this.productRepository.findById(product_id);
    if (!product) throw new ProductNotFoundError();
    return product;
  }
}

@Controller('products')
export class ProductController {
  constructor(private readonly productService: ProductService) {}
  @Get(':product_id')
  async getProduct(@Param('product_id', new ParseUUIDPipe()) product_id: ProductSchema['id']):
    Promise<ProductResponseDto> {
    const product = await this.productService.getProduct(product_id);
    return { id: product.id, nro_poliza: product.nro_poliza,
      product_type: product.product_type };
  }
}
```

**Importante:** una aplicación más estricta convierte el DTO validado en Command de Application en el controller. El service no importa decorators/DTOs de HTTP; Domain no importa NestJS ni Drizzle. El ejemplo anterior presupone guard de autenticación, autorización por recurso/tenant, provider injection y mapper explícitos en el consumidor.

## 4. Gate de contrato

- ✅ **Correcto:** nombres `listProducts`, `getProduct`, `registerProduct`, `approvePolicy`, `cancelOrder`; variables `product_id`, propiedad DI `productService`; tipos `ProductSchema['id']`; reutilización de schema propietario.
- ❌ **Incorrecto:** nombres `index/show/store/update/destroy` para casos de negocio, serializar fila Drizzle completa, clonar responses iguales o recibir ID sin validación HTTP.
- Pruebas: 400 por ID inválido, 401/403 por identidad/permiso, 404 sin exposición cross-tenant, 200 con allowlist, paginación default/borde, filtros y sort, Cache-Control apropiado y Swagger/Scalar congruente.
- **Estado:** `NOT_RUN` hasta ejecutar e2e/unit con NestJS y PostgreSQL consumidor.
