# Tutorial vigente — Productos NestJS: DDD semántico, Zod, Drizzle y observabilidad

> **Convención vigente HTTP:** schemas base solo para entidades; entradas/salidas HTTP en `*.dto.ts`; DTO `*.dto.ts` con Zod y tipo inferido en el mismo archivo; adaptador `*.doc.ts` opcional NestJS. [Fuente normativa](../../../standards/api/http-dtos-and-contracts.md). No asumir exports publicados renombrados sin migración.


> Fuente vigente de esta referencia: [convenciones transversales](../../../standards/engineering/naming-and-boundaries.md), [tipos `ProductSchema`](architecture/schema-derived-types.md), [DTO/paginación](http/semantic-dtos-and-pagination.md), [Drizzle](persistence/drizzle-conventions.md) y [SQL](../../../standards/data/sql-performance.md). El [ejemplo anterior íntegro](reference-feature-products-legacy-2026-10-25.md) se conserva como material **histórico no normativo**.

Estos fragmentos muestran fronteras y contratos; **no** constituyen una app compilada ni certifican instalación del paquete `@vigilioyonatan/bus-contracts` en un consumidor.

## 1. Propietarios de responsabilidades (DDD pragmático)

| Capa | Responsabilidad | No debe importar |
|---|---|---|
| Domain | `ProductEntity` y reglas/invariantes, schema estructurado propietario `productSchema` | Controller, ORM, HTTP |
| Application | `listProducts`, `getProduct`, `registerProduct`, repositorios/read models con `PageResult<T>` | Swagger, Express, componentes React |
| Infrastructure | Drizzle (PostgreSQL), Valkey adapter, outbox y drivers | DTO HTTP como fuente de SQL |
| Presentation | Guards, request/response schemas, controller, presenter, OpenAPI/Scalar | Credenciales en logs |

## 2. Schema propietario y tipo único `ProductSchema`

```typescript
// products/domain/schemas/product.schema.ts
import { z } from 'zod';
export const productSchema = z.object({
  id: z.number().int().positive(),
  tenant_id: z.number().int().positive(),
  nro_poliza: z.string().trim().min(1).max(30),
  product_type: z.enum(['inclusion', 'exclusion']),
  estado: z.enum(['pendiente', 'procesado', 'anulado']),
  broker_id: z.number().int().positive(),
  fecha_inicio: z.iso.date(),
});
export type ProductSchema = z.infer<typeof productSchema>;
```

Para IDs, estados y tipos de Product reutilizar `ProductSchema['id']`, `ProductSchema['estado']` y `ProductSchema['product_type']` **directamente**, sin tres alias vacíos. El id numérico es ilustrativo: UUID o entero dependen del contrato/migración real.

Drizzle puede reutilizar los enums del mismo schema:

```typescript
// products/infrastructure/persistence/products.table.ts — fragmento
export const productTypeEnum = pgEnum('product_type', productSchema.shape.product_type.options);
export const productStatusEnum = pgEnum('product_status', productSchema.shape.estado.options);
```

Las migraciones reales de PostgreSQL y cambios incompatibles deben gestionarse por separado; derivar las opciones no ejecuta DDL.

## 3. Contratos HTTP: Zod y tipo **en cada `.dto.ts`**

```typescript
// products/presentation/http/dto/list-products.query.dto.ts
import { z } from 'zod';
export const listProductsQueryDto = offsetPaginationQueryDto.extend({
  estado: productSchema.shape.estado.optional(),
});
export type ListProductsQueryDto = z.output<typeof listProductsQueryDto>;
```

```typescript
// products/presentation/http/dto/list-products.response.dto.ts
import { z } from 'zod';
export const listProductsResponseDto = createPaginatorDto(
  productSchema.pick({ id: true, nro_poliza: true, product_type: true }),
);
export type ListProductsResponseDto = z.output<typeof listProductsResponseDto>;
```

`offsetPaginationQueryDto` y `createPaginatorDto` provienen del `shared/http/dto/` de Vigilio. Se importan desde el módulo real (imports omitidos en estos fragmentos). Nada de archivos `*.validator.ts` para entrada ni salida HTTP, ni DTO separado solo para `z.output`. El tipo `ProductSummary` de Application puede usar `Pick<ProductSchema, ...>` sin schema Zod runtime adicional.

## 4. Repository: sin `Promise<{ items; total; ... }>` anónimo

```typescript
// shared/application/types/page-result.type.ts (una sola fuente)
export type PageResult<TItem> = z.infer<typeof paginatorMetaDto> & {
  results: TItem[];
};
```

```typescript
// products/application/types/product-summary.type.ts
export type ProductSummary = Pick<ProductSchema, 'id' | 'nro_poliza' | 'product_type'>;
```

```typescript
// products/application/ports/product-read.repository.ts
export interface ProductReadRepository {
  findByCriteria(
    criteria: ProductCriteria,
  ): Promise<PageResult<ProductSummary>>;
}
```

`paginatorMetaDto` debe definirse una vez en `shared` con `count`, `next` y `previous`; `PageResult<TItem>` es un tipo de Application, no un DTO HTTP importado a Domain. El adapter Drizzle aplica `tenant_id` autorizado, filtro y orden determinista con desempate `id`; `count` cuenta todos los registros filtrados, no solo la página. Comparar SQL contra PostgreSQL y hacer tests de autorización multi-tenant.

## 5. Application, caché y presenter separados

```typescript
// products/application/services/product.service.ts — fragmento
@Injectable()
export class ProductService {
  constructor(
    @Inject(PRODUCT_READ_REPOSITORY)
    private readonly productRepository: ProductReadRepository,
    @Inject(CACHE_PORT)
    private readonly cachePort: CachePort,
  ) {}

  async listProducts(
    criteria: ProductCriteria,
  ): Promise<PageResult<ProductSummary>> {
    // La clave debe incluir tenant autorizado, permisos, filtros y versión.
    const cache_key = createProductListCacheKey(criteria);
    const cached_page = await this.cachePort.get<PageResult<ProductSummary>>(cache_key);
    if (cached_page !== null) return cached_page;
    const page = await this.productRepository.findByCriteria(criteria);
    await this.cachePort.set(cache_key, page, 60);
    return page;
  }
}
```

```typescript
// products/presentation/http/presenters/product.presenter.ts — fragmento
export class ProductPresenter {
  presentProductsPage(
    page: PageResult<ProductSummary>,
  ): ListProductsResponseDto {
    return { count: page.count, next: page.next,
      previous: page.previous, results: page.results };
  }
}
```

El controller protegido valida query, obtiene scope de autorización y llama al caso de uso, luego al presenter. El adapter PostgreSQL no conoce el Presenter y el Presenter no conoce Valkey. El caché requiere invalidación **después** de commit, versionado por tenant y tratamiento de carreras. No usar `cache.del('products:*')`: `DEL` no expande wildcards. Si el `PageResult` cambia de forma para soportar cursores o una política de lectura diferente, actualizar el contrato de manera compatible.

## 6. Escrituras DDD, observabilidad y seguridad

`ProductEntity.approve()` aplica invariantes; `ProductService.approveProduct()` coordina transacción/autorización/idempotencia; el repository persiste. `ProductSchema['estado']` deriva estados válidos del schema cuando esa es su fuente canónica, evitando redefinir uniones. Registrar outbox dentro del commit si hay eventos externos, validar reintentos y actualizar caché de listas/detalles de manera segura.

En logging/tracing usar `products.listProducts`/`products.approveProduct`; redactar credenciales y PII. No usar `tenant_id`, `product_id` ni `nro_poliza` como **labels de métricas** de alta cardinalidad. Iniciar OTel antes de cargar módulos instrumentados.

## 7. Gates reales

1. Contract: Zod query input → output, página JSON exacta `{count,next,previous,results}`, OpenAPI/Scalar sincronizados.
2. AuthZ: 401/403, 404 cross-tenant seguro, tenant en filtros SQL, ACL y scopes en claves de caché.
3. Persistencia: `EXPLAIN (ANALYZE, BUFFERS)`, orden estable, filtro y count idénticos, transacción si snapshot requerido.
4. Comportamiento DDD: transiciones válidas e inválidas, commit/rollback, outbox, invalidación tras commit.
5. Runtime: pruebas de `ProductPresenter`, tracing, Pino sin secretos, CLI/docs; compilación del consumidor queda **NOT_RUN** si no se dispone del proyecto.

✅ **Correcto:** nombres de acciones semánticos, `ProductSchema` inferido, archivos independientes, `PageResult<T>` genérico y DI `camelCase`.

❌ **Incorrecto:** `index/show/store/update/destroy` como casos de uso, `z.object` en `.dto.ts`, schemas de operation dentro de `product.schema.ts`, retornos de repo anónimos y `toIndexResponse()`.
