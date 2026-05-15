# REFERENCIA HISTÓRICA — NO ES NORMA VIGENTE

> El texto siguiente se conserva sin eliminar decisiones ni ejemplos anteriores, pero sus nombres y ubicaciones DTO han sido reemplazados en [tutorial vigente](reference-feature-products.md) y [norma compartida](../../../standards/engineering/naming-and-boundaries.md). No copiar los bloques antiguos sin migrarlos.

# Tutorial de referencia — Productos NestJS, contratos Zod, Drizzle, caché, DDD y observabilidad

> **Referencia canónica actualizada:** [Contratos y paginación canónicos actualizados](http/semantic-dtos-and-pagination.md) · [Drizzle](persistence/drizzle-conventions.md). Los fragmentos anteriores conservados tienen valor de procedencia; adoptar esta guía para nuevos cambios.

> **Estado:** implementación pedagógica basada en convenciones Vigilio. Los fragmentos requieren integrarse al `src/`, `schema.ts`, guards, configuración de NestJS y paquetes reales del consumidor. El ZIP documental **no incluye** una aplicación NestJS ejecutable ni afirma que los fragmentos se hayan compilado con las dependencias del proyecto. No sustituye al [ejemplo extenso histórico](http/references/6-ejemplos-codigo.md) ni a la [guía canónica por responsabilidad](golden-path-feature.md).

## 1. Modelo de responsabilidad y decisiones

| Responsabilidad | Propietario | Regla |
| --- | --- | --- |
| Datos y schema base de producto | `application/schemas/` | `productSchema` define tipos/constraints públicos comunes; usar `.pick()` para proyecciones |
| Contratos HTTP | `application/dtos/` | schemas request/response puros, `z.infer`, paginación factory |
| Autorización/HTTP | `infrastructure/http/` | guard privado por defecto, adaptador OpenAPI, Zod query |
| Lectura + cache-aside | `application/service/` | `listProducts`, resultado tipado, `CachePort` |
| Persistencia | `infrastructure/persistence/drizzle/` | query con tenant/filtros, orden y total reales |
| Estados de negocio | `domain/` | `approveProduct` en agregado cuando hay invariante real |
| Observabilidad | `runtime/` | Pino/OpenTelemetry transversal, métricas de caché/DB sin PII |

**No crear una segunda verdad contractual:** los clientes TypeScript importan tipos/schemas desde el paquete de contratos aprobado; Laravel implementa el mismo OpenAPI y lo verifica en CI. No forzar `.parse()` sobre cada respuesta únicamente por tipado.

## 2. Zod: esquema, proyección, request y respuesta

```typescript
// application/schemas/product.schema.ts
import { z } from 'zod';

export const productStatus = {
  PENDING: 'pendiente',
  PROCESSED: 'procesado',
  CANCELLED: 'anulado',
} as const;

export const productSchema = z.object({
  id: z.number().int().positive(),
  nro_poliza: z.string().min(1).max(30),
  product_type: z.enum(['inclusion', 'exclusion']),
  estado: z.enum(productStatus),
  broker_id: z.number().int().positive(),
  fecha_inicio: z.iso.date(), // JSON string, no Date de dominio
});
export type ProductSchema = z.infer<typeof productSchema>;

export const productListItemSchema = productSchema.pick({
  id: true,
  nro_poliza: true,
  product_type: true,
});
export type ProductListItem = z.infer<typeof productListItemSchema>;

export const listProductsQuerySchema = offsetPaginationQuerySchema.extend({
  estado: productSchema.shape.estado.optional(),
});
export type ProductListQuery = z.output<typeof productListQuerySchema>;
```

La entrada de `@Query()` puede llegar como `string`; la salida del pipe debe ser `z.output` tras validación. Para `offset=''`, `z.coerce.number()` genera `0`: si el contrato rechaza vacío, añadir preprocesamiento previo o una política de validación más estricta. No convertir resultados validados de vuelta a `String`.

```typescript
// application/dtos/product-list.response.dto.ts
// Vigilio proporciona createPaginatorSchema en su módulo compartido de schemas.
export const listProductsResponseSchema =
  createPaginatorSchema(productListItemSchema);
export type ProductListResponseDto =
  z.infer<typeof listProductsResponseSchema>;
```

No definir `results: z.array(z.object({...}))` con campos duplicados cuando puedes reutilizar el `productSchema.pick()` propietario. No mezclar DTO HTTP con filas de Drizzle.

## 3. Contrato de lectura y resultado SQL

```typescript
// application/repositories/product-read.repository.ts
export interface ProductReadRepository {
  searchProducts(query: ProductListQuery, tenant_id: string): Promise<{
    items: ProductListItem[];
    total: number;
    next: string | null;
    previous: string | null;
  }>;
}
export const PRODUCT_READ_REPOSITORY = Symbol('PRODUCT_READ_REPOSITORY');
```

El puerto no conoce `Response`, `@ApiOkResponse`, `HttpStatus` ni SQL. Por pragmatismo puede retornar `ProductListItem`, que se deriva del mismo schema Zod; no hace falta una segunda interfaz para copiar tres columnas. El total significa **cantidad filtrada**, no tamaño de la página.

```typescript
// infrastructure/persistence/drizzle/product-read.repository.ts
// Fragmento: adaptar nombres de tablas, DB y drivers al consumidor.
import { and, count, desc, eq } from 'drizzle-orm';

const predicate = and(
  eq(products.tenant_id, tenant_id),
  query.estado ? eq(products.estado, query.estado) : undefined,
);
const items = await db.select({
  id: products.id,
  nro_poliza: products.nro_poliza,
  product_type: products.product_type,
}).from(products).where(predicate)
  .orderBy(desc(products.created_at), desc(products.id))
  .limit(query.limit).offset(query.offset);
const [{ total }] = await db.select({ total: count() })
  .from(products).where(predicate);

// Cursor/URLs next/previous se construyen según el contrato aprobado.
// No devolver next:null fijo si hay registros después de esta página.
```

**Nota de consistencia:** `total` y página son dos consultas; si tu producto necesita una instantánea estrictamente coherente entre ambas, evaluar transacción/snapshot y el costo. Si no necesitas total exacto, puedes optar por paginación cursor, pero eso es un cambio contractual explícito.

## 4. Application Service: método semántico y salida estática

```typescript
// application/service/product.application-service.ts
import { Inject, Injectable } from '@nestjs/common';

@Injectable()
export class ProductApplicationService {
  constructor(
    @Inject(PRODUCT_READ_REPOSITORY)
    private readonly repository: ProductReadRepository,
    @Inject(CACHE_PORT)
    private readonly cache: CachePort,
  ) {}

  async listProducts(
    query: ProductListQuery,
    tenant_id: string,
  ): Promise<ProductListResponseDto> {
    const key = await makeVersionedProductListKey(this.cache, tenant_id, query);
    const cached = await this.cache.get<ProductListResponseDto>(key);
    if (cached !== null) return cached;

    const page = await this.repository.searchProducts(query, tenant_id);
    const result: ProductListResponseDto = {
      success: true,
      count: page.total,
      next: page.next,
      previous: page.previous,
      results: page.items,
    };
    await this.cache.set(key, result, 60);
    return result;
  }
}
```

`makeVersionedProductListKey` es un helper **por implementar** que debe incluir tenant, query normalizada, versión de generación y alcance de autorización. Si un usuario obtiene proyección distinta por permisos, la key debe discriminar esos permisos o el caché debe permanecer detrás de la autorización efectiva. Definir comportamiento ante caída Redis (fallback seguro o fail-closed por criticidad).

**No agregamos `.parse()` en la salida del service** para repetir validación únicamente por obtener TypeScript. Aun así, una anotación de retorno no sanitiza: el repositorio selecciona explícitamente campos públicos y los tests comprueban JSON real.

## 5. Controller protegido + OpenAPI/Scalar

```typescript
// infrastructure/http/controllers/product.controller.ts
import { Controller, Get, Inject, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth, ApiForbiddenResponse, ApiOkResponse,
  ApiOperation, ApiTags, ApiUnauthorizedResponse,
} from '@nestjs/swagger';

@ApiTags('Products')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ProductsReadGuard)
@Controller('products')
export class ProductController {
  constructor(private readonly service: ProductApplicationService) {}

  @Get()
  @ApiOperation({ operationId: 'listProducts', summary: 'Listar productos' })
  @ApiOkResponse({ type: ProductListResponseDocDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  listProducts(
    @Query(new ZodQueryPipe(productListQuerySchema)) query: ProductListQuery,
    @CurrentTenant() tenant_id: string,
  ): Promise<ProductListResponseDto> {
    return this.service.listProducts(query, tenant_id);
  }
}
```

`JwtAuthGuard`, `ProductsReadGuard`, `@CurrentTenant`, `ZodQueryPipe` y `ProductListResponseDocDto` son adaptadores existentes o que el consumidor debe implementar/configurar. El ejemplo enseña las responsabilidades, no prueba que esos símbolos ya existan en todo proyecto. `@ApiBearerAuth` genera documentación, mientras los guards aplican seguridad. Scalar debe consumir el OpenAPI creado una sola vez en bootstrap; proteger la documentación según entorno. Si usas NestJS 12 con Standard Schema nativo, evaluar esa integración y evitar duplicar adaptadores Zod.

## 6. Operación DDD de escritura

Para `approveProduct()` no actualizar directamente el campo `estado` desde un controller. Cuando el negocio exige una transición concreta, el agregado valida la invariante con `approve()` (el Application Service sigue llamándose `approvePolicy()` cuando el negocio sea una póliza):

```typescript
// domain/entities/product.entity.ts — ejemplo de regla de negocio
export class Product {
  constructor(
    readonly id: number,
    private state: ProductStatus,
  ) {}

  approve(): void {
    if (this.state !== 'pendiente') throw new InvalidProductStateError();
    this.state = 'procesado';
  }

  getStatus(): ProductStatus { return this.state; }
}
```

El caso de uso recupera agregado en contexto tenant autorizado, protege concurrencia (bloqueo u optimismo), ejecuta `approveProduct`, persiste y confirma transacción. Solo después debe invalidar caché; para publicación fiable entre BD y workers, persistir outbox dentro del commit y procesarlo asincrónicamente. Una escritura puede cambiar el contrato, por lo que su resultado también debe ser DTO Zod derivado cuando se expone vía HTTP.

## 7. Invalidación de caché y consistencia

```typescript
// Port de cache para ilustrar operaciones; implementar adapter Redis/Valkey real
export interface CachePort {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds: number): Promise<void>;
  del(key: string): Promise<void>;
  incrementNamespaceVersion(namespace: string): Promise<number>;
}
```

- Para detalles: `cache.del('tenant:42:product:123')` elimina clave exacta tras commit.
- Para consultas: incrementar generación atómicamente, nuevas lecturas usan versión actual; las antiguas expiran por TTL.
- Una regeneración concurrente con datos previos puede volver a colocar valor obsoleto: probar carrera o usar versión de estado/lock cuando hay lectura consistente requerida.
- No usar `DEL('products:*')`: Redis/Valkey no expande comodines en `DEL`.
- Si la versión namespace desaparece por evicción mientras sobreviven entradas, definir manejo de epochs persistentes o estrategia de recuperación.

## 8. Observabilidad y errores

- HTTP: middleware/interceptor transversal para requestId/traceId, latencia y errores; redacción Pino.
- Infra: métricas de DB pool, latencia de query, caché hit/miss y lag de outbox.
- Negocio: logs selectivos de `product.approved` con ID no sensible únicamente si política lo permite.
- AuthZ: métricas agregadas de 401/403 y denegaciones por ruta sin `tenant_id` en labels.
- Exception filter traduce `InvalidProductStateError` a código HTTP acorde al OpenAPI (por ejemplo 409).
- OpenTelemetry se inicializa antes de librerías instrumentadas; comprobar exportación y contexto real en pruebas.

## 9. Pruebas y gates antes de copiar este patrón

```typescript
// Tests de frontera Zod: Vitest
expect(productListQuerySchema.parse({ limit: '25' }).limit).toBe(25);
expect(productListQuerySchema.safeParse({ limit: 'abc' }).success).toBe(false);
expect(productListQuerySchema.safeParse({ limit: '0' }).success).toBe(false);
expect(productListQuerySchema.safeParse({ limit: '101' }).success).toBe(false);
```

Integración mínima: filtros y total idénticos en SQL, paginación con orden estable, tenant cruzado, test del controller no autenticado/autorizado, payload sin atributos sensibles, caché hit/miss/ttl/invalidation, prueba de estado inválido y de transacción fallida. Comparar OpenAPI/Scalar contra el contrato Zod publicado. Medir p95 y no colocar PII en logs.

**✅ Correcto:** controller delgado; `.pick()`; `Promise<ProductListResponseDto>`; nombres DDD; scopes tenant; tests reales; runtime y versions del consumidor verificados.

**❌ Incorrecto:** SQL en controller, DTO duplicado, `.parse()` de salida solo para tipos, `@Public()` arbitrario, `@ZodResponse` accidental con interceptor, `count=rows.length` para total, caché por wildcard, afirmar que el código compiló sin un proyecto de referencia.

## Referencias oficiales y canónicas

- [Contrato y DTO](http/dtos-zod.md) · [Controllers](http/controllers.md) · [Casos de uso](application/use-cases.md) · [Repositorio Drizzle](persistence/drizzle-postgresql.md).
- [Tests](testing/integration-contract.md) · [Pino/OTel](runtime/pino-opentelemetry.md) · [Autorización](security/guards-authorization.md).
- [Nest OpenAPI](https://docs.nestjs.com/openapi/introduction) · [Drizzle SELECT y pagination](https://orm.drizzle.team/docs/select) · [OpenTelemetry JavaScript](https://opentelemetry.io/docs/languages/js/).
