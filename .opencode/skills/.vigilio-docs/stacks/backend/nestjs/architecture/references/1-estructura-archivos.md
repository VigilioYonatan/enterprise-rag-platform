# Estructura de Archivos - `bus-impl` 2026

> **Regla vigente:** Zod y `z.output` comparten **un solo `*.dto.ts`**. No crear `*.validator.ts` en código nuevo; ejemplos históricos se conservan por trazabilidad. [Norma](../../../../../standards/api/http-dtos-and-contracts.md).


> **PRECEDENCIA — cambios 2026-10-25:** Este capítulo es **histórico**, no plantilla vigente de nombres/rutas. Las entradas HTTP nuevas usan un único `*.dto.ts` con Zod y tipo inferido; entidades en `domain/schemas/` con `ProductSchema` / `OrderSchema`, métodos `OrderEntity.cancel()` y casos de uso `cancelOrder()`. Consultar [norma vigente](../../../../../standards/api/http-dtos-and-contracts.md). Conservar el resto del capítulo como contexto, sin copiar los fragmentos anteriores como nuevos estándares.

Este documento actualiza la estructura de `bus-impl` manteniendo el mismo enfoque DDD por modulo, pero con un stack 2026 orientado a NestJS, Zod, Drizzle, PostgreSQL, CDK y GitHub Actions.

---

## Arbol de directorios propuesto

```text
bus-impl/
|
|-- src/
|   |-- shared/
|   |   |-- application/
|   |   |   |-- schemas/                       # query, paginator, timestamp
|   |   |   `-- dtos/                          # DTOs transversales
|   |   |-- infrastructure/
|   |   |   |-- aws/                           # clientes y configuracion AWS local
|   |   |   |-- config/                        # carga y validacion de environment
|   |   |   |-- database/                      # DatabaseModule, DRIZZLE_DB y seed runner
|   |   |   |-- docs/                          # Swagger/OpenAPI
|   |   |   |-- env/                           # lectura segura de process.env
|   |   |   |-- http/
|   |   |   |   |-- decorators/
|   |   |   |   `-- pipes/                     # ZodPipe, ZodQueryPipe
|   |   |   |-- persistence/
|   |   |   |   `-- drizzle/
|   |   |   |       `-- custom-types/           # numeric exacto
|   |   |   `-- security/                      # guards, decorators y request autenticado
|   |
|   |-- product/                                # ejemplo completo de modulo CRUD
|   |   |-- application/
|   |   |   |-- schemas/                       # product.schema.ts, schemas Zod base
|   |   |   |-- dtos/                          # request/response derivados del schema
|   |   |   |-- repositories/                  # puertos usados por application
|   |   |   `-- service/
|   |   `-- infrastructure/
|   |       |-- http/
|   |       |   |-- controllers/
|   |       |   `-- dtos/                      # clases HTTP solo si Swagger las requiere
|   |       `-- persistence/
|   |           `-- drizzle/
|   |               |-- schema.ts
|   |               |-- product.repository.ts
|   |               `-- product.seeder.ts
|   |
|   |-- user/                                   # repite solo las carpetas que necesite
|   |-- auth/
|   |-- health/
|   |-- upload/
|   `-- ai-chat/
|
|-- cdk/
|   |-- bin/
|   |   `-- app.ts                             # entrada CDK
|   |-- lib/
|   |   |-- config/                            # lectura de stage, tags, naming
|   |   |-- stacks/
|   |   |   |-- api.stack.ts
|   |   |   |-- database.stack.ts
|   |   |   |-- network.stack.ts
|   |   |   `-- observability.stack.ts
|   |   `-- tags/
|   `-- assets/
|
|-- tests/
|   |-- unit/
|   |   |-- auth/
|   |   |-- config/
|   |   |-- health/
|   |   |-- user/
|   |   |-- product/
|   |   |-- upload/
|   |   `-- ai-chat/
|   |-- integration/
|   |   |-- repositories/
|   |   `-- aws/
|   |-- bdd/
|   |   `-- health/
|   |-- e2e/
|   |   |-- auth/
|   |   |-- openapi/
|   |   `-- security/
|   |-- fixtures/
|   `-- helpers/
|
|-- scripts/
|   |-- export-openapi.ts
|   |-- load-test.ts
|   |-- run-floci-tests.ts
|   |-- seed-local-db.ts
|   |-- smoke-endpoints.ts
|   `-- start-prod-like-local.ts
|
|-- docs/
|   `-- openapi/
|       `-- openapi.json
|
|-- openspec/                                  # specs y cambios del proyecto
|-- .opencode/
|   `-- skills/                                # copia gestionada para OpenCode
|-- .agents/
|   `-- skills/                                # copia gestionada para Codex/otros agentes
|-- .agent-stack/                              # integracion OmO experimental; hoy pausada
|
|-- .github/
|   |-- evidence-policy.json
|   |-- governance-policy.json
|   |-- repository-policy.json
|   `-- workflows/
|       |-- ci.yml
|       |-- preview.yml
|       |-- release-artifact.yml
|       |-- security-nightly.yml
|       |-- secure-deploy-cdk.yml
|       |-- deploy-development.yml
|       |-- deploy-staging.yml
|       |-- deploy-production.yml
|       |-- dora-metrics.yml
|       |-- governance-audit.yml
|       `-- jira-release.yml
|
|-- package.json
|-- pnpm-lock.yaml
|-- biome.json
|-- tsconfig.json
|-- vitest.config.ts
|-- vitest.integration.config.ts
|-- playwright.config.ts
|-- drizzle.config.ts
|-- cdk.json
`-- README.md
```

La automatizacion compartida no se copia dentro de `scripts/`. `bus-impl` consume los ejecutables
`vigilio-governance`, `vigilio-evidence`, `vigilio-node` y `vigilio-skills` desde paquetes publicados
por `vigilio-platform-actions`. `scripts/` conserva solamente logica propia del servicio.

Las carpetas `.opencode/skills/` y `.agents/skills/` son destinos generados por
`pnpm skills:sync`; la fuente editable vive en `vigilio-platform-actions/skills/`.

---

## Regla para organizar tests

La convencion recomendada es **tipo de prueba primero, modulo despues**:

```text
tests/
|-- unit/
|   |-- auth/
|   |   |-- auth.application-service.test.ts
|   |   `-- google-id-token.verifier.test.ts
|   |-- config/
|   |   `-- environment.schema.test.ts
|   |-- health/
|   |   `-- health.application-service.test.ts
|   |-- user/
|   |   `-- register-user.dto.test.ts
|   |-- product/
|   |   `-- register-product.dto.test.ts
|   |-- upload/
|   |   |-- upload.application-service.test.ts
|   |   `-- upload.dto.test.ts
|   `-- ai-chat/
|       `-- ai-chat.application-service.test.ts
|-- integration/
|   |-- repositories/
|   |   `-- repositories.integration.test.ts
|   `-- aws/
|       `-- s3.local.integration.test.ts
|-- e2e/
|   |-- auth/
|   |   `-- auth-products-users.api.spec.ts
|   |-- openapi/
|   |   `-- openapi.api.spec.ts
|   `-- security/
|       `-- security-negative.api.spec.ts
|-- bdd/
|   `-- health/
|       |-- health-readiness.feature
|       `-- health-readiness.steps.ts
`-- factories/                                  # solo si varias suites reutilizan datos
```

Reglas:

- `unit`, `integration`, `e2e` y `bdd` siguen siendo el primer nivel porque CI/CD ejecuta por tipo.
- Cada bounded context o modulo vive dentro de su carpeta: `auth`, `user`, `product`, `upload`.
- No dejar archivos sueltos en `tests/unit` cuando pertenecen a un modulo.
- Usar `@tests/*` para imports compartidos y evitar rutas relativas fragiles.

## Decision de estructura

### 1. Modulos por capacidad, DDD proporcional

Cada capacidad del sistema vive en un modulo propio. Para un CRUD clasico como `product` o `user`,
la estructura base es:

- `application/`
- `infrastructure/`

No crear carpetas vacias para anticipar complejidad. Agregar:

- `domain/` solo cuando existan invariantes, entidades, value objects, eventos o servicios de dominio.
- `commands/` y `queries/` solo cuando CQRS aporte una separacion real.
- `events/`, `bootstrap/` o workers solo cuando el modulo consuma o publique eventos.
- `step-functions/` solo cuando exista una orquestacion AWS implementada.
- un scheduler dentro del modulo propietario o en infraestructura compartida; no como bounded context
  vacio por defecto.

Dentro de `infrastructure/`, usar `http/` para controllers y `persistence/` para Drizzle/PostgreSQL.
Los demas adaptadores se agregan cuando el caso de uso los exige.

### 2. Zod vive en application e infrastructure, no en domain

Se recomienda usar:

- `application/schemas/` para schemas Zod base del modulo, por ejemplo `productSchema`
- `application/dtos/` para contratos Zod de request y response derivados con `pick`, `omit`, `extend` o `partial`
- los `*.dto.ts` son contratos Zod puros; las clases `createZodDto` viven en archivos hermanos `*.doc.ts`
- convencion de nombres:
  - `list-products.request.dto.ts` para query/params de `index`
  - `list-products.response.dto.ts` para response exitoso y errores de `index`
  - `register-product.request.dto.ts` para body/query/params de `store`
  - `register-product.response.dto.ts` para response exitoso y errores de `store`
  - no crear `*.query.dto.ts` o `*.params.dto.ts`; crear `.doc.ts` solo si NestJS/OpenAPI necesita una clase
- `infrastructure/persistence/drizzle/` y `drizzle-zod` para insert/select schemas de base de datos

El `domain/` debe seguir libre de Nest, Zod HTTP y detalles de base de datos.

### 2.1 Cache vive en application e infrastructure, no en domain

Se recomienda usar:

- `shared/application/cache/` para puertos como `cache.port.ts` y builders de keys
- `shared/infrastructure/cache/` para adapters reales como Valkey/ElastiCache o `noop`
- la decision de cachear una query vive en `application/`
- la implementacion concreta vive en `infrastructure/`

❌ Incorrecto:
- meter cache dentro de entidades de `domain/`
- acoplar casos de uso a un cliente concreto de Valkey o Redis
- asumir que memoria local de Lambda es cache compartida

### 3. Swagger se genera desde Nest, no desde YAML manual

La documentacion de API ya no depende de un contrato escrito a mano para la capa `impl`. Ahora el source of truth para la implementacion es:

- controller Nest
- DTO Zod puro dentro de `application/dtos/*.request.dto.ts` y `*.response.dto.ts`
- adaptadores `createZodDto` backend-only dentro de `application/dtos/*.request.doc.ts` y `*.response.doc.ts`
- decoradores `@nestjs/swagger`

Luego un script exporta `openapi.json` a `docs/openapi/`.

### 4. CDK reemplaza a Serverless Framework

Los archivos `serverless.yaml`, `functions.cloud.yaml` y `resources.yml` pasan a constructs y stacks de CDK:

- `api.stack.ts`
- `database.stack.ts`
- `network.stack.ts`
- `observability.stack.ts`

Esto reduce plantillas YAML dispersas y centraliza la infraestructura en TypeScript.

---

## Reutilizables compartidos

Estos archivos no pertenecen a un modulo de negocio especifico. Viven en `shared/` para que
`product`, `user` o `upload` no repitan validaciones comunes.

```text
src/shared/
|-- application/
|   |-- schemas/
|   |   |-- query.schema.ts                  # cursor + offset/limit + sort
|   |   |-- paginator.schema.ts              # response paginada
|   |   `-- timestamp.schema.ts              # created_at, updated_at
|   `-- dtos/
|       `-- api-error.response.ts
`-- infrastructure/
    |-- config/
    |   |-- config-loader.ts
    |   `-- environment.schema.ts
    |-- database/                            # modulo, schema, types y seed runner
    |-- docs/
    |   `-- swagger.config.ts
    |-- env/
    |   `-- read-env.ts
    |-- http/
    |   |-- decorators/
    |   `-- pipes/
    |       |-- zod.pipe.ts                  # valida body
    |       `-- zod-query.pipe.ts            # valida query params
    |-- persistence/
    |   `-- drizzle/
    |       `-- custom-types/
    |           `-- numeric-custom-types.ts  # numeric exacto y numeric para metricas
    `-- security/                            # guards, roles, public y request autenticado
```

Reglas:

- `querySchema` se reutiliza para listados con cursor hibrido y `offset/limit`.
- `createPaginatorDto(itemSchema)` se reutiliza para responses paginadas.
- `timestampSchema` evita repetir `created_at` y `updated_at`.
- `ZodPipe` valida body; `ZodQueryPipe` valida query params.
- `numericStringCustom` se usa para dinero o valores exactos; `numericNumberCustom` solo para metricas no monetarias.
- configuracion, seguridad y persistencia transversal viven en `shared/infrastructure/`.

---

## Ejemplo referencial de una feature de negocio `product`

La idea es que el flujo sea facil de leer:

`product` es un modulo que existe de verdad en `bus-impl`, asi que los ejemplos de abajo se pueden
contrastar con el codigo real en vez de quedarse en una feature imaginaria. No implica que todos los
proyectos necesiten ese modulo ni que un CRUD simple requiera todas sus capas.

```text
schema base -> request/response DTO -> controller -> application service -> repository port -> Drizzle repository
```

### 1. Schema base

```typescript
// src/product/application/schemas/product.schema.ts
import { z } from 'zod';

export const productSchema = z.object({
  id: z.number().int().positive(),
  nro_poliza: z.string().min(1).max(30),
  product_type: z.enum(['inclusion', 'exclusion']),
  fecha_inicio: z.iso.date(),
  broker_id: z.number().int().positive(),
});

export type ProductSchema = z.infer<typeof productSchema>;
```

### 2. DTOs de application

```typescript
// src/product/application/dtos/register-product.request.dto.ts
import { z } from 'zod';
import { productSchema } from '@/product/application/schemas/product.schema';

export const registerProductRequestDto = productSchema.pick({
  nro_poliza: true,
  product_type: true,
  fecha_inicio: true,
  broker_id: true,
});

export type RegisterProductRequestDto = z.infer<typeof registerProductRequestDto>;

```

```typescript
// src/product/application/dtos/change-product-details.request.dto.ts
import { z } from 'zod';
import { registerProductRequestDto } from './register-product.request.dto';

export const changeProductDetailsRequestDto = registerProductRequestDto.partial();

export type ChangeProductDetailsRequestDto = z.infer<typeof changeProductDetailsRequestDto>;
```

```typescript
// src/product/application/dtos/list-products.request.dto.ts
import { z } from 'zod';
import { querySchema } from '@/shared/application/schemas/query.schema';
import { productSchema } from '@/product/application/schemas/product.schema';

export const listProductsQueryDto = productSchema
  .pick({
    nro_poliza: true,
    product_type: true,
  })
  .partial()
  .extend(querySchema.shape);

export type ListProductsQueryDto = z.infer<typeof listProductsQueryDto>;

```

```typescript
// src/product/application/dtos/list-products.response.dto.ts
import { z } from 'zod';
import { createPaginatorDto } from '@/shared/http/dto/paginator.dto';
import { productSchema } from '@/product/application/schemas/product.schema';

export const listProductsResponseDto = createPaginatorDto(
  productSchema.pick({
    id: true,
    nro_poliza: true,
    product_type: true,
  }),
);

export type ListProductsResponseDto = z.infer<typeof listProductsResponseDto>;

```

```typescript
// src/product/application/dtos/get-product.response.dto.ts
import { z } from 'zod';
import { productSchema } from '@/product/application/schemas/product.schema';

export const getProductResponseDto = z.object({
  success: z.literal(true),
  product: productSchema.pick({
    id: true,
    nro_poliza: true,
    product_type: true,
  }),
});

export type GetProductResponseDto = z.infer<typeof getProductResponseDto>;
```

```typescript
// src/product/application/dtos/register-product.response.dto.ts
import { z } from 'zod';
import { getProductResponseDto } from './get-product.response.dto';

export const productResponseDto = getProductResponseDto;

export type RegisterProductResponseDto = z.infer<typeof productResponseDto>;

```

> Implementación y código original en [documento propietario del ejemplo](../../http/references/6-ejemplos-codigo.md). Consultar allí el bloque completo para evitar copias divergentes.


> Implementación y código original en [documento propietario del ejemplo](../../http/references/6-ejemplos-codigo.md). Consultar allí el bloque completo para evitar copias divergentes.


### 3. Doc DTOs backend-only

Si Swagger o Scalar necesitan clases, se declaran en archivos hermanos `.doc.ts`. Estos adaptadores no se exportan en `src/contracts.ts` ni se publican al frontend.

```typescript
// src/product/application/dtos/register-product.request.doc.ts
import { createZodDto } from 'nestjs-zod';
import { registerProductRequestDto } from './register-product.request.dto';

export class RegisterProductRequestDocDto extends createZodDto(registerProductRequestDto) {}
```

```typescript
// src/product/application/dtos/list-products.response.doc.ts
import { createZodDto } from 'nestjs-zod';
import { listProductsResponseDto } from './list-products.response.dto';

export class ListProductsResponseDocDto extends createZodDto(listProductsResponseDto) {}
```

### 4. Controller

```typescript
// src/product/infrastructure/http/controllers/product.controller.ts
import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ListProductsQueryDocDto } from '@/product/application/dtos/list-products.request.doc';
import {
  listProductsQueryDto,
  type ListProductsQueryDto,
} from '@/product/application/dtos/list-products.request.dto';
import { RegisterProductRequestDocDto } from '@/product/application/dtos/register-product.request.doc';
import {
  registerProductRequestDto,
  type RegisterProductRequestDto,
} from '@/product/application/dtos/register-product.request.dto';
import { ListProductsResponseDocDto } from '@/product/application/dtos/list-products.response.doc';
import type { ListProductsResponseDto } from '@/product/application/dtos/list-products.response.dto';
import { RegisterProductResponseDocDto } from '@/product/application/dtos/register-product.response.doc';
import type { RegisterProductResponseDto } from '@/product/application/dtos/register-product.response.dto';
import { ProductApplicationService } from '@/product/application/service/product.application-service';
import { ZodPipe } from '@/shared/infrastructure/http/pipes/zod.pipe';
import { ZodQueryPipe } from '@/shared/infrastructure/http/pipes/zod-query.pipe';

@ApiTags('products')
@ApiBearerAuth() // documentación; JwtAuthGuard y permiso real deben aplicarse
@Controller('products')
export class ProductController {
  constructor(private readonly service: ProductApplicationService) {}

  @Get()
  @ApiOperation({ operationId: 'listProducts', summary: 'Listar productos' })
  // Documentar query desde el contrato Zod en OpenAPI; si hay decoradores, verificar su equivalencia por diff.
  @ApiOkResponse({ type: ListProductsResponseDocDto })
  listProducts(
    @Query(new ZodQueryPipe(listProductsQueryDto)) query: ListProductsQueryDto,
  ): Promise<ListProductsResponseDto> {
    return this.service.listProducts(query);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ operationId: 'registerProduct', summary: 'Registrar producto' })
  @ApiBody({ type: RegisterProductRequestDocDto })
  @ApiCreatedResponse({ type: RegisterProductResponseDocDto })
  registerProduct(
    @Body(new ZodPipe(registerProductRequestDto)) body: RegisterProductRequestDto,
  ): Promise<RegisterProductResponseDto> {
    return this.service.registerProduct(body);
  }
}
```

### 5. Application service

```typescript
// src/product/application/service/product.application-service.ts
import { Inject, Injectable, Logger } from '@nestjs/common';
import type { ListProductsQueryDto } from '@/product/application/dtos/list-products.request.dto';
import type { RegisterProductRequestDto } from '@/product/application/dtos/register-product.request.dto';
import type { ListProductsResponseDto } from '@/product/application/dtos/list-products.response.dto';
import type { RegisterProductResponseDto } from '@/product/application/dtos/register-product.response.dto';
import type { IProductRepository } from '@/product/application/repositories/product.repository.interface';
import { PRODUCT_REPOSITORY } from '@/product/application/repositories/product.repository.token';

@Injectable()
export class ProductApplicationService {
  private readonly logger = new Logger(ProductApplicationService.name);

  constructor(
    @Inject(PRODUCT_REPOSITORY)
    private readonly repository: IProductRepository,
  ) {}

  async listProducts(query: ListProductsQueryDto): Promise<ListProductsResponseDto> {
    const page = await this.repository.searchProducts(query);
    this.logger.debug('products.listProducts completed'); // no registrar filtros sensibles
    return { success: true, count: page.total, next: page.next, previous: page.previous, results: page.items };
  }

  async registerProduct(body: RegisterProductRequestDto): Promise<RegisterProductResponseDto> {
    this.logger.debug('products.registerProduct completed'); // no registrar identificadores privados

    const persisted = await this.repository.saveNewProduct(body);

    return {
      success: true,
      product: {
        id: persisted.id,
        nro_poliza: persisted.nro_poliza,
        product_type: persisted.product_type,
      },
    };
  }
}
```

Reglas del ejemplo:

- `application/dtos/` usa Zod y `z.infer` para request/response.
- los schemas comunes (`querySchema`, `createPaginatorDto`, `timestampSchema`) viven en `shared/application/schemas/`.
- las clases `createZodDto` viven en `.doc.ts` y nunca dentro del contrato público.
- `ZodPipe` valida body y `ZodQueryPipe` valida query params.
- el controller no arma respuestas; delega al application service.
- los imports usan aliases absolutos como `@/product/...`.
- el domain no importa Nest, Drizzle ni AWS.
- Para CRUD simple no crear entities de dominio por obligacion; usar DTOs Zod, service y repository.

---

## Archivos raiz obligatorios

| Archivo | Proposito |
|---|---|
| `package.json` | scripts `pnpm`, dependencias y engines |
| `pnpm-lock.yaml` | lockfile canonico |
| `biome.json` | lint, format y organize imports |
| `vitest.config.ts` | tests unitarios base |
| `vitest.integration.config.ts` | tests con PostgreSQL real |
| `playwright.config.ts` | smoke y e2e sobre HTTP/docs |
| `drizzle.config.ts` | generate/migrate/check |
| `cdk.json` | contexto de infraestructura |
| `tsconfig.json` | TypeScript 6 en modo estricto |

---

## Diferencia clave frente al repo original

El `bus-impl` anterior tenia una fuerte mezcla de:

- handlers genericos
- middleware que normalizaba todo
- configuracion serverless en varios YAML

El actualizado separa mejor la entrada:

- HTTP con controllers REST tipados
- workers async con handlers explicitos
- documentacion OpenAPI generada desde Nest
- persistencia relacional via Drizzle

> Fuente única para **Correcto / Incorrecto: revisión 2026**: [abrir documento canónico](../../../../../governance/documentation-dry-and-ownership.md).

### ✅ Correcto / ❌ Incorrecto — Estructura de Archivos - `bus-impl` 2026

✅ **Correcto:** Para **Estructura de Archivos - `bus-impl` 2026**, emplear métodos DDD semánticos, DTOs Zod y DI camelCase para constructor.

❌ **Incorrecto:** En **Estructura de Archivos - `bus-impl` 2026**, importar ORM dentro de Domain o inventar aliases triviales de ProductSchema.
