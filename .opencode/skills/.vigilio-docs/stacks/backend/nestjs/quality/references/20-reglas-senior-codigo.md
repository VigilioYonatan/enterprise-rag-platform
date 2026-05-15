# Reglas Senior de Codigo - `bus-impl` 2026

> **ACTUALIZACIÓN NORMATIVA 2026-10-25:** este capítulo nació con convenciones antiguas (`index/store` y schema dentro de `.dto.ts`). Quedan reemplazadas por [nombres/DDD](../../../../../standards/engineering/naming-and-boundaries.md), [DTOs con Zod y tipo juntos](../../http/semantic-dtos-and-pagination.md) y [tutorial vigente](../../reference-feature-products.md). [Texto histórico completo](historico-reglas-senior-codigo-2026-10-25.md). Los apartados técnicos posteriores (typing, errores, queries, seguridad) siguen sujetos a estas fuentes canónicas.

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

## 4. Schema propietario y DTO HTTP único — VIGENTE

- `domain/schemas/product.schema.ts` define `productSchema` y `ProductSchema`; las tablas SQL viven en `*.table.ts`.
- `presentation/http/dto/register-product.request.dto.ts` exporta **en el mismo archivo** `registerProductRequestDto = productSchema.pick(...)` y `RegisterProductRequestDto = z.output<typeof registerProductRequestDto>`.
- Queries y responses siguen el mismo patrón; `createPaginatorDto` vive en `shared/http/dto/` y se reutiliza. No crear `validators/` o tipos para las mismas propiedades.
- Usar directamente `ProductSchema['id']`, `ProductSchema['estado']`, `ProductSchema['product_type']` en métodos; alias indexados solo si expresan una nueva semántica real.
- DI constructor `productRepository` y `this.productRepository` en `camelCase`; argumentos ordinarios `product_id` en `snake_case`.
- DDD semántico: `listProducts()`, `registerProduct()`, `approvePolicy()`, `cancelOrder()`; Domain `cancel()`, `approve()`.

✅ Correcto: Zod+tipo inferido en un DTO único; Application recibe comando propio; DTO no entra a Domain. ❌ Incorrecto: archivos `*.validator.ts` paralelos, campos duplicados, tipos indexados vacíos y CRUD genérico para transiciones de negocio.

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

## 6. Request/Response actuales — norma de precedencia

Un solo `register-product.request.dto.ts` y un solo `list-products.response.dto.ts`, cada uno con el objeto Zod y el tipo derivado. El schema de entidad permanece en `product.schema.ts`; la migración SQL en `products.table.ts`. No importar nestjs-zod desde contratos compartidos con web/Expo. Ver [ejemplo HTTP actual](../../http/semantic-dtos-and-pagination.md); la [edición íntegra anterior](historico-reglas-senior-codigo-2026-10-25.md) queda solo como histórico.

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

> Fuente única para **Correcto / Incorrecto: revisión 2026**: [abrir documento canónico](../../../../../governance/documentation-dry-and-ownership.md).

