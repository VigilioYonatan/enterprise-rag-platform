# ARCHIVO HISTÓRICO — LEER SOLO COMO PROCEDENCIA

> Sus recomendaciones de CRUD y DTO mezclados NO están vigentes. Consultar [estándar transversal](../../../../../standards/engineering/naming-and-boundaries.md), [tutorial actual](../../reference-feature-products.md) y [DTO semánticos](../../http/semantic-dtos-and-pagination.md).

# Reglas Senior de Codigo - `bus-impl` 2026

La baseline transversal de legibilidad, hardcode, excepciones y comentarios vive en
[Calidad y comentarios para revision](../../../../../software-factory/code-review-quality.md). Este documento
conserva las decisiones especificas de Node/Nest, Zod y Drizzle.

Estas reglas son obligatorias para mantener el `bus-impl` limpio, testeable y seguro. Si una regla se rompe, debe existir una excepcion documentada en ADR o en el PR.

---

## 1. Prohibiciones de tipado

Prohibido:

```typescript
const data: any = payload;
const items = [];
type Props = {};
```

Correcto:

```typescript
const data: unknown = payload;
const items: Item[] = [];
interface Props extends BaseProps {}
```

Reglas:

- no usar `any`; si el dato viene de fuera, usar `unknown` y validar con Zod.
- no dejar arrays vacios sin tipo explicito.
- preferir `interface` para contratos extendibles de objetos.
- si una libreria ya exporta un tipo, usarlo; no inventarlo.

Ejemplo:

```typescript
import type { LucideIcon } from 'lucide-react';

interface ActionItem {
  icon: LucideIcon;
  label: string;
}
```

---

## 2. Imports siempre arriba

Prohibido:

```typescript
const fs = await import('node:fs/promises');
```

Correcto:

```typescript
import fs from 'node:fs/promises';
```

Regla:

- los imports estaticos van siempre arriba.
- usar dynamic import solo para lazy loading real, plugins opcionales o rutas que reduzcan cold start con evidencia.

---

## 3. Tipos estrictos y no magicos

Prohibido:

```typescript
type Type = 'group';
const result = customFunction<'users' | 'roles'>('users');
```

Correcto:

```typescript
export type FileNodeType = 'group' | 'file';
export type UserViewMode = 'users' | 'roles';

const result = customFunction<UserViewMode>('users');
```

Reglas:

- no usar union types inline dentro de generics si se reutilizan o tienen significado de negocio.
- exportar el tipo si cruza archivo, modulo o capa.
- no crear strings magicos cuando el dominio tiene mas estados posibles.

---

## 4. Schemas base limpios; DTOs derivados por endpoint

Los schemas base describen el contrato canonico de la feature y viven en `application/schemas/*.schema.ts`. Ese archivo no debe llenarse con DTOs de `store`, `update`, `index` o filtros especificos de endpoints.

Los DTOs de request pueden derivar desde el schema base con `pick`, `omit`, `partial` o `extend` dentro del propio `*.request.dto.ts`, porque esa validacion pertenece al endpoint. Los schemas reutilizables de verdad, como `userPublicSchema` o `productSummarySchema`, si pueden vivir en `application/schemas`.

Prohibido en `application/schemas/example.schema.ts`: exportar constantes con sufijo `RequestDto`, `ResponseDto`, `QueryDto`, `ParamsDto` o class DTOs. Ese archivo no representa endpoints; representa el modelo Zod base o schemas reutilizables.

Correcto en `application/schemas/example.schema.ts`:

```typescript
export const exampleSchema = z.object({
  id: z.number(),
  name: z.string(),
  created_at: z.date(),
  updated_at: z.date(),
});

export type ExampleSchema = z.infer<typeof exampleSchema>;
```

Correcto en `application/dtos/example-store.request.dto.ts`:

```typescript
import { z } from 'zod';
import { exampleSchema } from '../schemas/example.schema';

export const exampleStoreRequestDto = exampleSchema.pick({
  name: true,
});

export type ExampleStoreRequestDto = z.infer<typeof exampleStoreRequestDto>;

```

Adaptador NestJS/OpenAPI en `application/dtos/example-store.request.doc.ts`:

```typescript
import { createZodDto } from 'nestjs-zod';
import { exampleStoreRequestDto } from './example-store.request.dto';

export class ExampleStoreRequestDocDto extends createZodDto(exampleStoreRequestDto) {}
```

Cuando un schema base permite `nullable`, pero el endpoint o formulario necesita el campo requerido, usar `.unwrap()`:

```typescript
export const authRegisterRequestDto = userSchema
  .pick({
    username: true,
    email: true,
    password: true,
  })
  .extend({
    phone_number: userSchema.shape.phone_number.unwrap(),
    repeat_password: userSchema.shape.password,
  });
```

Reglas:

- `application/schemas/*.schema.ts` contiene schemas base o derivados realmente reutilizables, no DTOs especificos de endpoint.
- `*.schema.ts` puede exportar `ExampleSchema`, interfaces o types del schema base.
- `*.schema.ts` no exporta `ExampleStoreRequestDto`, `ExampleIndexQueryDto`, `ExampleStoreResponseDto` ni class DTOs.
- `pick`, `omit`, `partial` y `extend` de request viven en `*.request.dto.ts`.
- `pick`, `omit`, `partial` y `extend` de response viven en `*.response.dto.ts`.
- Para tipos auxiliares derivados usar `Pick<SourceType, Keys>`, `Omit`, `Partial`, `Readonly` o
  intersecciones; no repetir manualmente campos que ya existen en `SourceType`.
- Si el tipo derivado representa datos externos, inferirlo desde un schema Zod derivado; `Pick<>` y
  `Omit<>` solo actúan en compilación y no validan runtime.
- los request DTOs no deben rellenar defaults de persistencia con `.default(...)` si la DB/Drizzle ya tiene `default(...)` o el campo es nullable.
- usar `.default(...)` en request DTO solo cuando el default es regla explicita del contrato HTTP y no una conveniencia de persistencia.
- en `store/create`, evitar `.optional()` para campos de negocio; si el cliente debe expresar ausencia de valor, usar `nullable` y exigir `null`.
- si un campo tiene default en Drizzle/PostgreSQL, no incluirlo en el `store.request.dto.ts`; la DB aplica el default.
- `optional` solo representa omision real del campo en el contrato HTTP; reservarlo para query params, filtros o `partial()` de `update/PATCH`.
- no hacer `pick`, `omit`, `Pick<>` u `Omit<>` en services, repositories ni controllers.
- Esa prohibición evita componer contratos dentro de capas de negocio: definir la proyección en
  schemas/DTOs o en un tipo de borde y pasar al service un contrato nombrado.
- crear nombres de schema reutilizables solo cuando cruzan varios DTOs o casos: `UserPublicSchema`, `ProductSummarySchema`.
- `extend` se permite solo cuando el campo no existe en el schema base o cuando se fuerza un caso explicito como `.unwrap()`.
- no usar `.merge()` en Zod v4; preferir `.extend(OtherSchema.shape)` o `z.object({ ...A.shape, ...B.shape })`.
- query, params y body viven juntos en `*.request.dto.ts`.
- los response DTOs deben ser fieles al resultado real del service.
- crear maximo 2 contratos públicos por accion/caso de uso: `example-store.request.dto.ts` y `example-store.response.dto.ts`.
- si se necesita clase Swagger, crear el adaptador hermano `*.request.doc.ts` o `*.response.doc.ts` usando `createZodDto`.
- `index`, `show`, `store`, `update`, `destroy` son convenciones de CRUD simple, NO una obligacion para comandos de dominio.
- Si hay transiciones/invariantes de negocio, nombrar los casos de uso por intencion (`approvePolicy`, `cancelOrder`, `activateSubscription`, `calculatePremium`) y exponer `operationId` semantico estable con su contrato.
- Controllers y services retornan el `ResponseDto` propio de la operacion (CRUD: `ExampleIndexResponseDto`; negocio: `OrderCancelResponseDto`, etc.).

---

## 5. Query HTTP: coercion explicita Zod v4 (regla vigente 2026-10-23)

Regla: `*.request.dto.ts` conserva el schema canonico Zod, y la transformacion de strings HTTP
numericamente validos ocurre **una sola vez**, dentro del schema. `ZodQueryPipe` llama `safeParse`
y devuelve el output resultante; NO hace `String(Number(value))` ni duplica coercion.

Ejemplo recomendado para enteros decimales de query (rechaza `''`, blancos, `1e3`, `-1`, arrays,
`Infinity` y numeros fuera de rango; `offset=0` sigue siendo valido):

```typescript
import { z } from 'zod';

const unsignedQueryInteger = z.string()
  .regex(/^(0|[1-9]\d*)$/, 'Expected an unsigned decimal integer')
  .pipe(z.coerce.number<string>().int());

export const querySchema = z.object({
  cursor: z.string().optional(),
  limit: unsignedQueryInteger.pipe(z.number().positive().max(100)).default(25),
  offset: unsignedQueryInteger.pipe(z.number().min(0)).default(0),
  search: z.string().optional(),
  sort_by: z.string().default('created_at'),
  sort_dir: z.enum(['asc', 'desc']).default('desc'),
});

export type QueryWire = z.input<typeof querySchema>;
export type QuerySchema = z.output<typeof querySchema>; // number, no string
```

Para contratos que aceptan *intencionalmente* coercion amplia es valido
`z.coerce.number().int().positive().max(100).default(25)`, pero `Number('') === 0`:
no usar la coercion amplia para `offset` sin limitar entradas no deseadas.
Tambien se admite `.transform(Number)` seguida de `.pipe(z.number().int()...)` cuando
se justifica. No convertir ids opacos, codigos ni numeros monetarios exactos.

`z.infer` representa el tipo de **salida**; usar `z.input` al modelar input HTTP. Si la
version instalada del generador OpenAPI no representa bien `pipe/transform`, declarar
la representacion HTTP string+format/pattern mediante el adapter documental,
conservando un solo contrato logico. Ver [46](../../http/references/46-zod-query-ddd-versiones-2026.md).

---

## 6. Request DTO y response DTO son los 2 archivos canonicos

`application/dtos/*.request.dto.ts` define todo lo que entra al endpoint: body, query, params y tipos inferidos, sin imports NestJS.

`application/dtos/*.response.dto.ts` define todo lo que sale del endpoint: response exitoso, errores esperados, errores de validacion y tipos inferidos, sin imports NestJS.

```typescript
// src/example/application/dtos/example-index.response.dto.ts
import { createPaginatorSchema } from '@/shared/application/schemas/paginator.schema';
import { z } from '@/shared/infrastructure/config/zod-i18n.config';
import { exampleSchema } from '../schemas/example.schema';

export const exampleIndexResponseDto = createPaginatorSchema(
  examplePublicSchema,
);

export type ExampleIndexResponseDto = z.infer<typeof exampleIndexResponseDto>;
```

```typescript
// src/example/application/dtos/example-show.response.dto.ts
import { z } from '@/shared/infrastructure/config/zod-i18n.config';
import { exampleSchema } from '../schemas/example.schema';

export const exampleShowResponseDto = z.object({
  success: z.literal(true),
  example: examplePublicSchema,
});

export type ExampleShowResponseDto = z.infer<typeof exampleShowResponseDto>;

```

```typescript
// src/example/application/dtos/example-show.response.doc.ts
import { createZodDto } from 'nestjs-zod';
import { exampleShowResponseDto } from './example-show.response.dto';

export class ExampleShowResponseDocDto extends createZodDto(exampleShowResponseDto) {}
```

```typescript
show(@Req() req: Request, @Param('id') id: string): Promise<ExampleShowResponseDto> {
  return this.exampleService.show(req.tenant.id, id);
}
```

Regla:

- `ResponseDto` es el contrato que retorna service/controller.
- `ResponseDocDto` es adaptador para `@ZodResponse` y Swagger/Scalar.
- `ResponseDocDto` vive en `*.response.doc.ts` y no se exporta en el paquete público.
- por accion/caso de uso no crear mas contratos públicos que `*.request.dto.ts` y `*.response.dto.ts`; los `.doc.ts` son adaptadores opcionales.

---

## 6.1 Alta cohesion en services

Todo lo relacionado a una funcionalidad vive en su carpeta y su service. Un service no debe inyectar cache o repositorios de otro modulo si puede delegar al service dueño.

Correcto:

```typescript
@Injectable()
export class AuthService {
  constructor(private readonly userService: UserService) {}

  async register(tenant_id: number, body: AuthRegisterDto): Promise<AuthLoginResponseDto> {
    const existingUser = await this.userService.getByEmailForAuth(tenant_id, body.email);

    if (existingUser) {
      throw new BadRequestException('El usuario ya esta registrado');
    }

    const username = body.email.split('@')[0];
    const { user } = await this.userService.store(tenant_id, {
      email: body.email,
      username,
      password: body.password,
      repeat_password: body.repeat_password,
      role_id: 2,
      status: 'active',
      avatar: null,
      phone_number: body.phone_number,
      google_id: null,
      mfa_secret: null,
    });

    return this.login(user);
  }
}
```

Incorrecto:

```typescript
class OtherService {
  constructor(
    private readonly exampleRepository: ExampleRepository,
    private readonly exampleCache: ExampleCache,
  ) {}
}
```

Reglas:

- `ExampleCache` pertenece a `ExampleService`, no a `AuthService` ni a `OtherService`.
- si otro modulo necesita crear un example, llama a `exampleService.store(...)`.
- despues de `store`, `update` o `destroy`, invalidar cache; no usar `.set()` optimista salvo razon documentada.
- evitar `as` en returns; si necesitas castearlo, el repositorio esta mal tipado.

---

## 7. Clean Code en async y cache

Evitar returns inline complejos:

```typescript
const cached = await this.cacheService.get<UserSchema>(this.getKey(tenant_id, id));
return toNull(cached);
```

Para cache con paginador:

```typescript
return paginator<ExampleIndexQueryDto, ExampleIndexSchema>('/examples', {
  filters: query,
  cb: async (filters, isClean) => {
    if (isClean) {
      const cached = await this.exampleCache.getList(tenant_id, filters);
      if (cached) {
        return cached;
      }
    }

    const result = await this.exampleRepository.index(tenant_id, filters);

    if (isClean) {
      await this.exampleCache.setList(tenant_id, filters, result);
    }

    return result;
  },
});
```

Reglas:

- usar variables intermedias descriptivas para debug y observabilidad.
- cachear solo queries limpias, deterministicas y con TTL claro.
- no esconder DB/cache/error handling dentro de un return anidado.

---

## 8. Drizzle, queries y paginacion

Reglas:

- base filters se aplican a data y count.
- cursor filters solo se aplican a data.
- sorting dinamico solo acepta columnas existentes.
- usar cursor solo si el orden es compatible.
- no usar `.values({ ... } as any)`.
- no hacer N+1 queries.

Ejemplo:

```typescript
const baseWhere: SQL[] = [eq(categoryEntity.tenant_id, tenant_id)];

if (query.search) {
  baseWhere.push(ilike(categoryEntity.name, `%${query.search}%`));
}

const baseWhereClause = and(...baseWhere);
const cursorWhere: SQL[] = [...baseWhere];

if (query.cursor) {
  cursorWhere.push(lt(categoryEntity.id, Number(query.cursor)));
}

const cursorWhereClause = and(...cursorWhere);
let orderBy: SQL<unknown>[] = [desc(categoryEntity.id)];

if (query.sort_by && query.sort_dir) {
  const columns = getTableColumns(categoryEntity);
  const column = columns[query.sort_by as keyof typeof columns];

  if (column) {
    orderBy = [query.sort_dir === 'asc' ? asc(column) : desc(column)];
  }
}

const isCursorCompatible =
  !query.sort_by || query.sort_by === 'id' || query.sort_by === 'created_at';
const useCursor = Boolean(query.cursor && isCursorCompatible);

const result = await Promise.all([
  this.db.query.categoryEntity.findMany({
    limit: useCursor ? query.limit + 1 : query.limit,
    offset: useCursor ? undefined : query.offset,
    where: useCursor ? cursorWhereClause : baseWhereClause,
    orderBy,
  }),
  this.db
    .select({ count: sql<number>`count(*)` })
    .from(categoryEntity)
    .where(baseWhereClause)
    .then((rows) => Number(rows[0].count)),
]);

return result;
```

N+1 prohibido:

```typescript
const examples = await db.query.examples.findMany({
  with: { posts: true },
});
```

Bulk insert:

```typescript
await db.insert(table).values(data.map((item) => ({ ...item, tenant_id })));
```

---

## 9. Seeders y operaciones masivas

Reglas:

- seeders tipados con `Omit<EntitySchema, 'id'>[]`.
- usar `Promise.all` cuando se generan datos async.
- insertar en bulk, no con `for...of` haciendo `await` por fila.
- `fs/promises` para archivos; evitar `readFileSync` salvo scripts de arranque muy simples.

```typescript
@Injectable()
export class UserSeeder {
  constructor(@Inject(DRIZZLE) private readonly db: NodePgDatabase<typeof schema>) {}

  async run(tenant_id: number, role_id: number) {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('Dokixd123@', salt);

    const usersSeed: Omit<UserSchema, 'id'>[] = await Promise.all(
      Array.from({ length: 100 }).map(async (_, index): Promise<Omit<UserSchema, 'id'>> => {
        const username = `${faker.person.firstName()}${faker.person.lastName()}-${index + 1}`;

        return {
          username,
          password: hashedPassword,
          tenant_id,
          role_id,
          created_at: now().toDate(),
          updated_at: now().toDate(),
          deleted_at: null,
        };
      }),
    );

    return this.db.insert(userEntity).values(usersSeed).returning();
  }
}
```

---

## 10. Memory leaks y paralelismo

Event listeners con cleanup:

```typescript
onModuleInit() {
  this.emitter.on('event', this.handler);
}

onModuleDestroy() {
  this.emitter.off('event', this.handler);
}
```

Async paralelo:

```typescript
const [example, posts, comments] = await Promise.all([
  getExample(id),
  getPosts(id),
  getComments(id),
]);
```

---

## 11. Logger con contexto

```typescript
this.logger.debug(
  {
    example_id: exampleId,
    action: 'login',
    ip: req.ip,
    duration_ms: Date.now() - start,
  },
  'Login successful',
);
```

```typescript
try {
  await riskyOperation();
} catch (error) {
  this.logger.error(
    {
      error: error instanceof Error ? error.message : 'Unknown',
      stack: error instanceof Error ? error.stack : undefined,
      context: { example_id: exampleId },
    },
    'Operation failed',
  );

  throw error;
}
```

---

## 12. Uploads tipados

Para agregar una feature con archivos:

```typescript
export const courseSchema = pgTable('courses', {
  thumbnail: jsonb('thumbnail').$type<FilesSchema[]>(),
  attachments: jsonb('attachments').$type<FilesSchema[]>(),
});
```

```typescript
export type EntityFile = 'user' | 'product' | 'course';

export const UPLOAD_CONFIG = {
  course: {
    thumbnail: {
      ...UPLOAD_RULES.banner,
      dimensions: [DIMENSION_IMAGE.xs, DIMENSION_IMAGE.md],
      folder: 'courses',
      max_files: 1,
    },
    attachments: {
      ...UPLOAD_RULES.document,
      folder: 'courses',
      max_files: 5,
    },
  },
} as const;
```

Regla:

- el upload-service debe leer config tipada y no tener `if entity === 'course'` dispersos.

---

## 13. Zod v4

Reglas Zod v4:

- usar `{ error: 'mensaje' }` en lugar de strings posicionales.
- reemplazar `invalid_type_error` y `required_error` por `error`.
- usar `z.email()`, `z.url()`, `z.uuid()`, `z.iso.date()` y `z.iso.datetime()` cuando aplique.
- evitar `.merge()`; preferir `.extend(OtherSchema.shape)` o shape spreading.

```typescript
const shortString = z.string().min(5, { error: 'Demasiado corto' });

const userNameSchema = z.string({
  error: (issue) => {
    if (issue.input === undefined) {
      return 'Campo obligatorio';
    }

    if (typeof issue.input !== 'string') {
      return 'Debe ser un texto';
    }

    return 'Error generico';
  },
});

const extendedSchema = z.object({
  ...baseSchema.shape,
  ...additionalSchema.shape,
});
```

## ✅ Correcto / ❌ Incorrecto: revisión 2026

- ✅ **Correcto:** Leer contexto real, seguir normas canónicas y documentar precondiciones, ejemplos, contraejemplos y verificación.
- ❌ **Incorrecto:** Copiar snippets sin imports, asumir versiones instaladas o declarar pruebas `PASS` sin ejecutarlas.
- **Al recibir código existente:** primero caracterizar el comportamiento, después refactorizar en pasos comprobables. [Guía canónica de modernización](../../../../../standards/engineering/refactoring-existing-code.md).

> **Referencia histórica completa, migrada sin recortes de contenido técnico.** La norma vigente corresponde a `foundations/` y `standards/`; las especializaciones NestJS están en `stacks/backend/nestjs/`. Ante contradicciones, seguir documentación canónica y pruebas del proyecto. Los enlaces relativos se actualizaron para mantener la navegación.

✅ **Correcto:** aplicar la normativa compartida y adaptar estos ejemplos tras comprobar versiones.

❌ **Incorrecto:** copiar ciegamente un fragmento histórico o imponer reglas de NestJS a Laravel.
