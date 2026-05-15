# Refactorización NestJS/TypeScript sin romper contratos ni DDD

## Checklist de descubrimiento

1. Revisar `package.json`, `pnpm-lock.yaml`, versión real de Node/NestJS/Zod, dependencias de Swagger y adaptador HTTP.
2. Leer controller, schemas, DTO `.pick()`/`.extend()`, service, port, adapter Drizzle, tests y guards vecinos.
3. Registrar la API pública: query/body/output, OpenAPI exportado, errores, auth y efectos de workers.
4. Identificar `index/store/update` que *ocultan transiciones de dominio*; `index` CRUD heredado no es un bug por sí mismo. Renombrar métodos internos con un cambio acotado y tests; conservar URL/contract cuando sea necesario.

## Zod: conversión HTTP y tipado sin duplicación

```typescript
import { z } from 'zod';

const positiveIntFromHttp = z.string()
  .regex(/^[1-9]\d*$/, 'Número decimal positivo')
  .pipe(z.coerce.number<string>().int().max(100));

export const productListQueryValidator = z.object({
  limit: positiveIntFromHttp.default(25),
  offset: z.string().regex(/^(0|[1-9]\d*)$/)
    .pipe(z.coerce.number<string>().int().nonnegative()).default(0),
});

export type ProductListQuery = z.output<typeof productListQueryValidator>;
```

✅ Correcto: parsear **una vez** en pipe de entrada, usar `z.output` para datos ya normalizados, generar response con `productSchema.pick()` y paginador genérico. ❌ Incorrecto: convertir número a string después de parse, aceptar `limit=''` implícitamente, hacer `.parse()` de respuesta en varias capas sólo para tipar o crear dos schemas para frontend/Swagger.

En schemas que también aceptan números programáticos puede corresponder `z.coerce.number().int()`, pero acotar valores sin permitir accidentalmente booleanos, cadenas vacías, hexadecimales o notación exponencial.

## DDD, controller y seguridad

```typescript
// ✅ El controller delega, devuelve DTO tipado y usa los guards reales del proyecto.
@Get()
@ApiOperation({ operationId: 'listProducts' })
@ApiOkResponse({ type: ListProductsResponseDocDto })
listProducts(@Query(new ZodQueryPipe(listProductsQueryDto)) query: ListProductsQueryDto)
  : Promise<ListProductsResponseDto> {
  return this.application.listProducts(query);
}
```

No olvidar la autenticación/autorizar: los decoradores Swagger no son un guard. Para comandos con invariantes, `ApprovePolicy` orquesta, el agregado valida, y el repositorio escribe con control de concurrencia. DTO HTTP nunca debe incluir secretos aunque `productSchema` contenga otros campos.

## Bucles y performance

```typescript
// ❌ Se pierden errores de las promesas y no se espera ejecución.
items.forEach(async (item) => { await persistItem(item); });

// ✅ Orden estricto y transacciones condicionadas al caso de uso.
for (const item of items) {
  await persistItem(item);
}

// ✅ Operación pura, nueva colección.
const ids = items.map((item) => item.id);
```

Evitar N+1 en Drizzle y evitar que `Promise.all` provoque un número ilimitado de conexiones. Comparar SQL antes/después, analizar EXPLAIN y usar batch cuando corresponda. No convertir automáticamente cada `for` en `map`.

## Caché y trazas

- ❌ `cache.del('products:*')`, `@Public` accidental, claves compartidas entre tenants y `logger.debug(query)` si contiene PII.
- ✅ Key con ámbito de tenant/permisos/filtros, TTL y versión; invalidación posterior a commit; métricas `hit/miss/error` de baja cardinalidad, spans de aplicación sólo para operaciones relevantes.
- ✅ Usar instrumentación OpenTelemetry de HTTP/DB y Pino con correlación; no registrar payloads o cabeceras sensibles.

## Gates

`pnpm lint`, `pnpm typecheck`, `pnpm test:unit`, integración PostgreSQL, E2E de autorización, `pnpm openapi:export` y `pnpm openapi:diff` **si existen en el proyecto**; no inventar comandos. Reportar `NOT_RUN` cuando no hay entorno y no afirmar que el ejemplo aislado compila.

Documento canónico: [reglas generales de refactor](../../../../standards/engineering/refactoring-existing-code.md); [NestJS anterior](../http/references/6-ejemplos-codigo.md); [DDD](../../../../foundations/architecture/ddd.md).

> Fuente única para **Correcto / Incorrecto: revisión 2026**: [abrir documento canónico](../../../../governance/documentation-dry-and-ownership.md).


## TypeScript: secuencias, efectos y concurrencia — ejemplo trasladado sin pérdida

```typescript
// ❌ INCORRECTO: descarta el array retornado, oculta side effects.
items.map(async (item) => await sendEmail(item));

// ✅ CORRECTO: efectos secuenciales para respetar orden/rate limits.
for (const item of items) {
  await sendEmail(item);
}

// ✅ CORRECTO: transformación pura.
const ids = items.map((item) => item.id);

// ✅ CORRECTO cuando es seguro paralelizar y la colección es pequeña/acotada.
await Promise.all(items.map((item) => sendEmail(item)));
```

**No** utilizar el último ejemplo para miles de jobs ni APIs limitadas: usar un pool con límite explícito. No hacer que el número de conexiones coincida con el número de registros.

## Iteraciones y concurrencia específicas

- **JavaScript/TypeScript:** `map()` para producir un arreglo; `filter()` para seleccionar; `reduce()` cuando mejora claridad; `for...of` para recorrido secuencial con efectos/`await`; `for` indexado cuando necesitas índice, salida anticipada o perfil de hot path lo justifica.
- **Evitar `array.map(async...)` sin esperar las promesas.** `Promise.all(items.map(...))` sólo para cargas independientes con concurrencia acotada cuando existan límites de IO/rate-limit; de lo contrario, `for...of`/pool.

## Colecciones TypeScript: casos exactos conservados

```typescript
// ❌ Uso incorrecto de map: efecto lateral y descarte del array nuevo.
products.map((product) => logger.info(product.id));

// ✅ Transformación: map retorna nuevos datos.
const summaries = products.map(({ id, name }) => ({ id, name }));

// ✅ Side effects secuenciales, con posibilidad de break/continue y await.
for (const product of products) {
  if (!product.enabled) continue;
  await notifyProductOwner(product);
}

// ❌ forEach no espera a la promesa del callback.
products.forEach(async (product) => { await notifyProductOwner(product); });
```

Cuando el resultado de `.map()` es una nueva lista que se usa, no lo cambies a `for` sólo por microbenchmark no reproducible.
