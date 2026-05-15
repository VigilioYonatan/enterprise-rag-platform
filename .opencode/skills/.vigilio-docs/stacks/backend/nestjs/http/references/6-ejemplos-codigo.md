# Ejemplos de Codigo - `bus-impl` 2026

Este documento muestra pequenos ejemplos reales del stack actualizado.

---

## 1. Schemas, pipes y utilidades reutilizables

```typescript
// src/shared/application/schemas/query.schema.ts
import { z } from 'zod';

export const querySchema = z.object({
  cursor: z.string().optional(),
  limit: z.number().int().positive().max(100).default(25),
  offset: z.number().int().min(0).default(0),
  search: z.string().optional(),
  sort_by: z.string().default('created_at'),
  sort_dir: z.enum(['asc', 'desc']).default('desc'),
});

export type QuerySchema = z.infer<typeof querySchema>;
```

```typescript
// src/shared/application/schemas/paginator.schema.ts
import { z } from 'zod';

export function createPaginatorSchema<T extends z.ZodTypeAny>(itemSchema: T) {
  return z.object({
    success: z.literal(true),
    count: z.number().int().min(0),
    next: z.string().nullable(),
    previous: z.string().nullable(),
    results: z.array(itemSchema),
  });
}

export type PaginatorSchema<T extends z.ZodTypeAny> = ReturnType<typeof createPaginatorSchema<T>>;
```

```typescript
// src/shared/application/schemas/timestamp.schema.ts
import dayjs from 'dayjs';
import { z } from 'zod';

export const customDateSchema = z.preprocess(
  (val) => {
    if (val instanceof Date) return val;
    if (typeof val === 'string') return dayjs(val).toDate();
    return val;
  },
  z.date().refine((d) => !Number.isNaN(d.getTime()), { message: 'Invalid date' }),
);

export const timestampSchema = z.object({
  created_at: customDateSchema,
  updated_at: customDateSchema,
});

export type TimestampSchema = z.infer<typeof timestampSchema>;
```

```typescript
// src/shared/application/utils/file.util.ts
export function formatFileSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(2)} ${units[unitIndex]}`;
}

export function fileExtensionFromMime(mimeType: string): string {
  const map: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'application/pdf': 'pdf',
    'application/zip': 'zip',
    'text/csv': 'csv',
  };

  return map[mimeType] ?? 'bin';
}

export function isAllowedMimeType(mimeType: string, allowedTypes: readonly string[]): boolean {
  return allowedTypes.includes(mimeType);
}
```

```typescript
// src/shared/config/upload.config.ts
export const UPLOAD_RULES = {
  avatar: {
    max_size: 2 * 1024 * 1024,
    mime_types: ['image/jpeg', 'image/png', 'image/webp'],
    dimensions: { width: 400, height: 400 },
  },
  document: {
    max_size: 50 * 1024 * 1024,
    mime_types: ['application/pdf', 'application/zip', 'text/csv'],
  },
} as const;

export const UPLOAD_CONFIG = {
  MAX_FILE_SIZE: 5 * 1024 * 1024 * 1024,
  PART_SIZE: 5 * 1024 * 1024,
  MAX_PARTS: 10000,
  PRESIGNED_URL_EXPIRY: 900,
  ALLOWED_MIME_TYPES: [
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf',
    'application/zip',
    'text/csv',
  ] as const,
  user: {
    avatar: {
      dimensions: { width: 400, height: 400 },
      max_size: 2 * 1024 * 1024,
      mime_types: ['image/jpeg', 'image/png', 'image/webp'],
    },
  },
} as const;

export type AllowedMimeType = (typeof UPLOAD_CONFIG.ALLOWED_MIME_TYPES)[number];
export type UploadMimeType = (
  | (typeof UPLOAD_RULES.avatar.mime_types)[number]
  | (typeof UPLOAD_RULES.document.mime_types)[number]
) &
  string;
```

```typescript
// src/shared/infrastructure/persistence/drizzle/custom-types/numeric-custom-types.ts
import { customType } from 'drizzle-orm/pg-core';

export const numericStringCustom = (name?: string, precision?: number, scale?: number) => {
  const pgPrecision = precision ?? 12;
  const pgScale = scale ?? 2;

  return customType<{
    data: string;
    driverData: string;
  }>({
    dataType() {
      return `numeric(${pgPrecision},${pgScale})`;
    },
    fromDriver(value: string): string {
      return value;
    },
    toDriver(value: string): string {
      return value;
    },
  })(name ?? 'numeric_string');
};

export const numericNumberCustom = (name?: string, precision?: number, scale?: number) => {
  const pgPrecision = precision ?? 12;
  const pgScale = scale ?? 2;

  return customType<{
    data: number;
    driverData: string;
  }>({
    dataType() {
      return `numeric(${pgPrecision},${pgScale})`;
    },
    fromDriver(value: string): number {
      return Number(value);
    },
    toDriver(value: number): string {
      return value.toString();
    },
  })(name ?? 'numeric_number');
};
```

Regla:

- `numericStringCustom` para dinero, primas, saldos, tasas regulatorias y valores que exigen precision exacta.
- `numericNumberCustom` solo para metricas o valores no monetarios donde la perdida binaria sea aceptable.

```typescript
// src/shared/infrastructure/http/pipes/zod.pipe.ts
import { BadRequestException, Injectable, type PipeTransform } from '@nestjs/common';
import type { ZodSchema } from 'zod';

@Injectable()
export class ZodPipe implements PipeTransform {
  constructor(private readonly schema: ZodSchema) {}

  transform(value: unknown) {
    const result = this.schema.safeParse(value);

    if (!result.success) {
      throw new BadRequestException({
        statusCode: 400,
        message: 'Validation failed',
        errors: result.error.issues.map((e) => ({
          field: String(e.path.join('.')),
          message: e.message,
        })),
      });
    }

    return result.data;
  }
}
```

```typescript
// src/shared/infrastructure/http/pipes/zod-query.pipe.ts
import { BadRequestException, Injectable, type PipeTransform } from '@nestjs/common';
import type { ZodSchema, ZodTypeAny } from 'zod';

@Injectable()
export class ZodQueryPipe<T extends ZodTypeAny> implements PipeTransform {
  constructor(private readonly schema: ZodSchema<T>) {}

  transform(value: Record<string, string>): T['_output'] {
    const parsed: Record<string, string> = { ...value };

    if (parsed.limit) {
      parsed.limit = String(Number(parsed.limit));
    }

    if (parsed.offset) {
      parsed.offset = String(Number(parsed.offset));
    }

    const result = this.schema.safeParse(parsed);

    if (!result.success) {
      throw new BadRequestException({
        statusCode: 400,
        message: 'Query validation failed',
        errors: result.error.issues.map((e) => ({
          field: String(e.path.join('.')),
          message: e.message,
        })),
      });
    }

    return result.data;
  }
}
```

---

## 2. Schema Zod base

```typescript
// src/product/application/schemas/product.schema.ts
import { z } from 'zod';
import { timestampSchema } from '@/shared/application/schemas/timestamp.schema';

export const productSchema = z.object({
  id: z.number().int().positive(),
  nro_poliza: z.string().min(1).max(30),
  product_type: z.enum(['inclusion', 'exclusion']),
  fecha_inicio: z.iso.date(),
  broker_id: z.number().int().positive(),
  estado: z.enum(['pendiente', 'procesado', 'anulado']),
  ...timestampSchema.shape,
});

export type ProductSchema = z.infer<typeof productSchema>;
```

---

## 3. DTOs Zod derivados del schema

```typescript
// src/product/application/dtos/product-store.request.dto.ts
import { z } from 'zod';
import { productSchema } from '../schemas/product.schema';

export const productStoreRequestDto = productSchema.pick({
  nro_poliza: true,
  product_type: true,
  fecha_inicio: true,
  broker_id: true,
});

export type ProductStoreRequestDto = z.infer<typeof productStoreRequestDto>;
```

```typescript
// src/product/application/dtos/product-update.request.dto.ts
import { z } from 'zod';
import { productStoreRequestDto } from './product-store.request.dto';

export const productUpdateRequestDto = productStoreRequestDto.partial();

export type ProductUpdateRequestDto = z.infer<typeof productUpdateRequestDto>;
```

```typescript
// src/product/application/dtos/product-index.request.dto.ts
import type { z } from 'zod';
import { querySchema } from '@/shared/application/schemas/query.schema';
import { productSchema } from '../schemas/product.schema';

export const productIndexQueryDto = productSchema
  .pick({
    nro_poliza: true,
    estado: true,
  })
  .partial()
  .extend(querySchema.shape);

export type ProductIndexQueryDto = z.infer<typeof productIndexQueryDto>;
```

```typescript
// src/product/application/dtos/product-index.response.dto.ts
import { z } from 'zod';
import { createPaginatorSchema } from '@/shared/application/schemas/paginator.schema';
import { productSchema } from '../schemas/product.schema';

export const productIndexResponseDto = createPaginatorSchema(
  productSchema.pick({
    id: true,
    nro_poliza: true,
    product_type: true,
  }),
);

export type ProductIndexResponseDto = z.infer<typeof productIndexResponseDto>;
```

```typescript
// src/product/application/dtos/product-show.response.dto.ts
import { z } from 'zod';
import { productSchema } from '../schemas/product.schema';

export const productShowResponseDto = z.object({
  success: z.literal(true),
  product: productSchema.pick({
    id: true,
    nro_poliza: true,
    product_type: true,
  }),
});

export type ProductShowResponseDto = z.infer<typeof productShowResponseDto>;
```

```typescript
// src/product/application/dtos/product-store.response.dto.ts
import { z } from 'zod';
import { productShowResponseDto } from './product-show.response.dto';

export const productStoreResponseDto = productShowResponseDto;

export type ProductStoreResponseDto = z.infer<typeof productStoreResponseDto>;
```

```typescript
// src/product/application/dtos/product-update.response.dto.ts
import { z } from 'zod';
import { productShowResponseDto } from './product-show.response.dto';

export const productUpdateResponseDto = productShowResponseDto;

export type ProductUpdateResponseDto = z.infer<typeof productUpdateResponseDto>;
```

```typescript
// src/product/application/dtos/product-destroy.response.dto.ts
import { z } from 'zod';

export const productDestroyResponseDto = z.object({
  success: z.literal(true),
  message: z.string(),
});

export type ProductDestroyResponseDto = z.infer<typeof productDestroyResponseDto>;
```

---

## 4. Doc DTOs para Swagger y validation pipe

Los contratos `*.dto.ts` permanecen puros. Las clases para Swagger/Scalar viven en archivos hermanos `.doc.ts`, que no se exportan al frontend.

```typescript
// src/product/application/dtos/product-store.request.doc.ts
import { createZodDto } from 'nestjs-zod';
import { productStoreRequestDto } from './product-store.request.dto';

export class ProductStoreRequestDocDto extends createZodDto(productStoreRequestDto) {}
```

```typescript
// src/product/application/dtos/product-index.response.doc.ts
import { createZodDto } from 'nestjs-zod';
import { productIndexResponseDto } from './product-index.response.dto';

export class ProductIndexResponseDocDto extends createZodDto(productIndexResponseDto) {}
```

---

## 5. Controller con Zod + Swagger

```typescript
// src/product/infrastructure/http/controllers/product.controller.ts
import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ProductApplicationService } from '../../../application/service/product.application-service';
import { ZodResponse } from 'nestjs-zod';
import { Public } from '@/shared/infrastructure/security/public.decorator';
import {
  productIndexQueryDto,
  type ProductIndexQueryDto,
} from '../../../application/dtos/product-index.request.dto';
import {
  productStoreRequestDto,
  type ProductStoreRequestDto,
} from '../../../application/dtos/product-store.request.dto';
import { ProductStoreRequestDocDto } from '../../../application/dtos/product-store.request.doc';
import { ProductIndexResponseDocDto } from '../../../application/dtos/product-index.response.doc';
import type { ProductIndexResponseDto } from '../../../application/dtos/product-index.response.dto';
import { ProductStoreResponseDocDto } from '../../../application/dtos/product-store.response.doc';
import type { ProductStoreResponseDto } from '../../../application/dtos/product-store.response.dto';
import { ZodPipe } from '@/shared/infrastructure/http/pipes/zod.pipe';
import { ZodQueryPipe } from '@/shared/infrastructure/http/pipes/zod-query.pipe';

@ApiTags('products')
@Controller('products')
export class ProductController {
  constructor(private readonly productApplicationService: ProductApplicationService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Indexar products' })
  @ZodResponse({ status: 200, type: ProductIndexResponseDocDto })
  async index(
    @Query(new ZodQueryPipe(productIndexQueryDto)) query: ProductIndexQueryDto,
  ): Promise<ProductIndexResponseDto> {
    return this.productApplicationService.index(query);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crear product' })
  @ApiBody({ type: ProductStoreRequestDocDto })
  @ZodResponse({ status: 201, type: ProductStoreResponseDocDto })
  async store(
    @Body(new ZodPipe(productStoreRequestDto)) body: ProductStoreRequestDto,
  ): Promise<ProductStoreResponseDto> {
    return this.productApplicationService.store(body);
  }
}
```

Nota:

- `ZodPipe` valida body y `ZodQueryPipe` valida query params
- el backend recomendado es `private-by-default`; `@Public()` abre solo las rutas que deben quedar sin auth
- `cleanupOpenApiDoc(...)` normaliza el documento generado para los DTOs Zod
- los DTOs reutilizan el schema base con `pick`, `omit`, `extend` o `partial`
- `@Query()` queda validado por el query schema dentro de `*.request.dto.ts` y por `ZodQueryPipe`
- `application/dtos/*.response.dto.ts` define los `ResponseDto` que retornan services/controllers
- los `ResponseDocDto` viven en `*.response.doc.ts` y adaptan los schemas públicos para `@ZodResponse(...)`, Swagger y Scalar

---

## 5.1 Caso de uso RRLL con decoradores NestJS y Zod

Este ejemplo implementa en code-first la convencion RRLL definida en
[Contratos API y limites backend](../../../../../software-factory/backend-api-contracts.md#perfil-corporativo-rrll).
Si `bus-dsg`, `ch-dsg` u otro contrato externo es el owner, el YAML conserva autoridad y el OpenAPI
exportado por NestJS debe validarse contra el.

El proceso de negocio es `Registrar Endoso`, pero la implementacion conserva la convencion tecnica del
stack: `store` en `operationId`, controller, application service y repository.

```typescript
@ApiTags('Endosos RRLL')
@Controller('endosos')
export class EndosoController {
  constructor(private readonly service: EndosoApplicationService) {}

  @Post()
  @ApiOperation({
    summary: 'Registrar Endoso RRLL',
    operationId: 'store',
    description: [
      '📦 Proceso: Registrar Endoso',
      '',
      '🔧 Funcionalidad: Servicio que permite registrar endosos RRLL.',
    ].join('\n'),
  })
  @ApiHeader({
    name: 'TraceId',
    required: true,
    description: 'Identificador de trazabilidad de la solicitud.',
  })
  @ApiSecurity('sigv4')
  @ApiBody({ type: RegistrarEndosoRequestDocDto })
  @ApiValidationErrorResponse()
  @ApiUnexpectedErrorResponse()
  @ZodResponse({
    status: 200,
    description: 'Endoso registrado correctamente.',
    type: RegistrarEndosoResponseDocDto,
  })
  store(
    @Body(new ZodPipe(registrarEndosoRequestDto)) body: RegistrarEndosoRequestDto,
  ): Promise<RegistrarEndosoResponseDto> {
    return this.service.store(body);
  }
}
```

Los adaptadores de documentacion reutilizan el mismo schema runtime:

```typescript
export class RegistrarEndosoRequestDocDto extends createZodDto(registrarEndosoRequestDto) {}
export class RegistrarEndosoResponseDocDto extends createZodDto(registrarEndosoResponseDto) {}
```

Casos de uso y texto documental:

| Caso | `summary` | `📦 Proceso` | `🔧 Funcionalidad` |
| --- | --- | --- | --- |
| comando con body | accion breve | actividad de negocio | resultado observable |
| consulta | verbo y recurso consultado | consulta ejecutada | informacion devuelta y proposito |
| actualizacion | cambio permitido | actualizacion aplicada | efecto y limites relevantes |
| anulacion | accion exacta del dominio | anulacion real | resultado, restricciones y reversibilidad |

Reglas:

- usar `@ApiBearerAuth()` si el proyecto usa bearer; `@ApiSecurity('sigv4')` solo cuando el scheme esta
  registrado en `DocumentBuilder` y el runtime lo aplica;
- preferir decoradores compartidos para `TraceId` y errores cuando existan;
- declarar params, query, multipart, status y errores que el endpoint implemente realmente;
- code-first genera normalmente `#/components/schemas/...`; si se exigen `$ref` relativos a archivos,
  mantener contract-first;
- ejecutar lint, export/bundle y diff del OpenAPI.

---

## 6. Application service

```typescript
// src/product/application/service/product.application-service.ts
import { Inject, Injectable, Logger } from '@nestjs/common';
import type { ProductIndexQueryDto } from '../dtos/product-index.request.dto';
import type { ProductStoreRequestDto } from '../dtos/product-store.request.dto';
import type { ProductIndexResponseDto } from '../dtos/product-index.response.dto';
import type { ProductStoreResponseDto } from '../dtos/product-store.response.dto';
import type { IProductRepository } from '../repositories/product.repository.interface';
import { PRODUCT_REPOSITORY } from '../repositories/product.repository.token';

@Injectable()
export class ProductApplicationService {
  private readonly logger = new Logger(ProductApplicationService.name);

  constructor(
    @Inject(PRODUCT_REPOSITORY)
    private readonly productRepository: IProductRepository,
  ) {}

  async index(query: ProductIndexQueryDto): Promise<ProductIndexResponseDto> {
    this.logger.log({ action: 'product.index', query }, 'Indexing products');

    return this.productRepository.index(query);
  }

  async store(body: ProductStoreRequestDto): Promise<ProductStoreResponseDto> {
    this.logger.log({ action: 'product.store', broker_id: body.broker_id }, 'Storing product');

    const persisted = await this.productRepository.store(body);

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

---

## 7. Puerto de repositorio

```typescript
// src/product/application/repositories/product.repository.interface.ts
import type { ProductIndexQueryDto } from '../dtos/product-index.request.dto';
import type { ProductStoreRequestDto } from '../dtos/product-store.request.dto';
import type { ProductIndexResponseDto } from '../dtos/product-index.response.dto';
import type { ProductStoreResponseDto } from '../dtos/product-store.response.dto';

export interface IProductRepository {
  index(query: ProductIndexQueryDto): Promise<ProductIndexResponseDto>;
  store(body: ProductStoreRequestDto): Promise<ProductStoreResponseDto['product']>;
}
```

```typescript
// src/product/application/repositories/product.repository.token.ts
export const PRODUCT_REPOSITORY = Symbol('PRODUCT_REPOSITORY');
```

---

## 8. Schema Drizzle

```typescript
// src/product/infrastructure/persistence/drizzle/schema.ts
import { pgTable, serial, varchar, date, integer, timestamp } from 'drizzle-orm/pg-core';

export const productTable = pgTable('product', {
  id: serial('id').primaryKey(),
  nro_poliza: varchar('nro_poliza', { length: 30 }).notNull(),
  product_type: varchar('product_type', { length: 20 }).notNull(),
  fecha_inicio: date('fecha_inicio').notNull(),
  broker_id: integer('broker_id').notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
```

---

## 9. Repositorio Drizzle

```typescript
// src/product/infrastructure/persistence/drizzle/product.repository.ts
import { Inject, Injectable } from '@nestjs/common';
import { DRIZZLE_DB } from '../../../../shared/infrastructure/database/database.constants';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { productTable } from './schema';
import type { IProductRepository } from '../../../application/repositories/product.repository.interface';
import type { ProductIndexQueryDto } from '../../../application/dtos/product-index.request.dto';
import type { ProductIndexResponseDto } from '../../../application/dtos/product-index.response.dto';
import type { ProductStoreRequestDto } from '../../../application/dtos/product-store.request.dto';

@Injectable()
export class ProductRepository implements IProductRepository {
  constructor(
    @Inject(DRIZZLE_DB)
    private readonly db: NodePgDatabase,
  ) {}

  async index(query: ProductIndexQueryDto): Promise<ProductIndexResponseDto> {
    const rows = await this.db
      .select({
        id: productTable.id,
        nro_poliza: productTable.nro_poliza,
        product_type: productTable.product_type,
      })
      .from(productTable)
      .limit(query.limit)
      .offset(query.offset);

    return {
      success: true,
      count: rows.length,
      next: null,
      previous: null,
      results: rows,
    };
  }

  async store(body: ProductStoreRequestDto) {
    const [row] = await this.db
      .insert(productTable)
      .values({
        nro_poliza: body.nro_poliza,
        product_type: body.product_type,
        fecha_inicio: body.fecha_inicio,
        broker_id: body.broker_id,
      })
      .returning();

    return row;
  }
}
```

---

## 10. Configuracion tipada del entorno

```typescript
// src/shared/infrastructure/config/environment.schema.ts
import { z } from 'zod';

export const environmentSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  APP_STAGE: z.enum(['local', 'development', 'staging', 'production']).default('local'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1).optional(),
  AWS_REGION: z.string().default('us-east-1'),
  DOCS_AUTH_TOKEN: z.string().optional(),
});

export type EnvironmentVariables = z.infer<typeof environmentSchema>;

export function validateEnvironment(config: Record<string, unknown>): EnvironmentVariables {
  return environmentSchema.parse(config);
}
```

Uso en Nest:

```typescript
ConfigModule.forRoot({
  cache: true,
  isGlobal: true,
  validate: validateEnvironment,
});
```

---

## 11. Bootstrap de Swagger + Scalar

```typescript
// src/shared/infrastructure/docs/swagger.config.ts
import { randomBytes } from 'node:crypto';
import path from 'node:path';
import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { apiReference } from '@scalar/nestjs-api-reference';
import type { Express, RequestHandler } from 'express';
import { cleanupOpenApiDoc } from 'nestjs-zod';

const scalarBundlePath = path.resolve('dist/assets/scalar.js');

export function createOpenApiDocument(app: INestApplication) {
  const config = new DocumentBuilder()
    .setTitle('Bus Impl API')
    .setDescription('API de negocio actualizada a 2026')
    .setVersion('2026.06')
    .addBearerAuth()
    .build();

  const rawDocument = SwaggerModule.createDocument(app, config);
  return cleanupOpenApiDoc(rawDocument);
}

function scalarCsp(nonce: string): string {
  return [
    "default-src 'none'",
    `script-src 'nonce-${nonce}' 'self'`,
    "script-src-attr 'none'",
    "style-src 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'none'",
    "connect-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'none'",
    "form-action 'none'",
  ].join('; ');
}

export function setupApiDocumentation(app: INestApplication) {
  const document = createOpenApiDocument(app);
  const expressApp = app.getHttpAdapter().getInstance() as Express;

  expressApp.get('/openapi.json', (_request, response) => response.json(document));
  expressApp.get('/reference-assets/scalar.js', (_request, response, next) => {
    response.type('application/javascript');
    response.sendFile(scalarBundlePath, (error) => (error ? next(error) : undefined));
  });

  const reference: RequestHandler = (request, response, next) => {
    const nonce = randomBytes(16).toString('base64');
    response.setHeader('Content-Security-Policy', scalarCsp(nonce));

    apiReference({
      url: '/openapi.json',
      cdn: '/reference-assets/scalar.js',
      nonce,
      theme: 'default',
      favicon: '/reference-assets/brand-mark.svg',
      customCss: `
        :root {
          --scalar-color-accent: #d71920;
          --scalar-font: ui-sans-serif, system-ui, sans-serif;
        }
      `,
      withDefaultFonts: false,
      telemetry: false,
      agent: { disabled: true },
      showDeveloperTools: 'never',
      hideClientButton: true,
      persistAuth: false,
    })(request, response, next);
  };

  app.use('/reference', reference);
  return document;
}
```

```typescript
// src/shared/infrastructure/observability/logger/logger.module.ts
import { Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';
import { environments } from '@/shared/infrastructure/config/environments';

@Module({
  imports: [
    LoggerModule.forRootAsync({
      useFactory: () => ({
        pinoHttp: {
          level: environments.app_stage === 'production' ? 'info' : 'debug',
          redact: {
            paths: [
              'req.headers.authorization',
              'req.headers.cookie',
              'req.headers[\"set-cookie\"]',
              'req.body.password',
              'req.body.token',
              'req.body.secret',
            ],
            remove: true,
          },
          customProps: (req) => ({
            service: 'bus-impl',
            stage: environments.app_stage,
            request_id: req.id,
            correlation_id: req.headers['x-correlation-id'],
          }),
          transport:
            environments.app_stage === 'local'
              ? {
                  target: 'pino-pretty',
                  options: { singleLine: true, colorize: true },
                }
              : undefined,
        },
      }),
    }),
  ],
  exports: [LoggerModule],
})
export class AppLoggerModule {}
```

```typescript
// src/main.ts
import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';
import { ZodValidationPipe } from 'nestjs-zod';
import { AppModule } from './app.module';
import { setupApiDocumentation } from './shared/infrastructure/docs/swagger.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));
  app.useGlobalPipes(new ZodValidationPipe());

  setupApiDocumentation(app);

  await app.listen(3000);
}

void bootstrap();
```

Nota sobre branding:

- en la integracion `@scalar/nestjs-api-reference` si puedes cambiar tema, layout, tipografia y colores
- no se documenta una propiedad runtime oficial `logo` en esta integracion embebida
- logo y favicon se sirven desde el mismo origen y se aplican mediante `customCss` + `favicon`
- no se permiten CDN externos, fuentes remotas ni `unsafe-inline` en `script-src`
- ver [Scalar y OpenAPI seguros en produccion](./47-scalar-openapi-produccion.md) para build, CSP y checklist

---

## 12. Ejemplo de script para exportar OpenAPI

```typescript
// scripts/export-openapi.ts
import { NestFactory } from '@nestjs/core';
import { writeFile } from 'node:fs/promises';
import { AppModule } from '../src/app.module';
import { ZodValidationPipe } from 'nestjs-zod';
import { createOpenApiDocument } from '../src/shared/infrastructure/docs/swagger.config';

async function exportOpenApi() {
  const app = await NestFactory.create(AppModule, { logger: false });
  app.useGlobalPipes(new ZodValidationPipe());

  const document = createOpenApiDocument(app);

  await writeFile('docs/openapi/openapi.json', JSON.stringify(document, null, 2));
  await app.close();
}

void exportOpenApi();
```

Buenas practicas del logger:

- `pino-pretty` solo en local
- `stdout` JSON en cloud
- redaction obligatoria para secrets y cookies
- leer stage y niveles desde `shared/infrastructure/config/environments.ts`
- `Logger` de `@nestjs/common` dentro de servicios; `Logger` de `nestjs-pino` solo para bootstrap `app.useLogger(...)`


## Buenas prácticas y antipatrones

✅ **Correcto:** Implementar adaptadores tipados Zod y DocumentBuilder centralizado con separación de esquemas y DTOs semánticos.

❌ **Incorrecto:** Duplicar interfaces manuales sin validación runtime ni sincronización con el contrato OpenAPI.
