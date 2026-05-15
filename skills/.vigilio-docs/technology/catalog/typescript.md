# TypeScript — buenas prácticas canónicas Vigilio (7.x)

**Versión de referencia contrastada:** TypeScript **7.0.2** publicado en agosto de 2026; la versión instalada del consumidor se obtiene de su lockfile. TypeScript 7 incluye un compilador nativo y posibles cambios en opciones/tooling: validar cada monorepo antes de migrar. Fuente: [release oficial](https://github.com/microsoft/TypeScript/releases/tag/v7.0.2). Baseline único: [versions.md](../versions.md).

## Alcance y arquitectura

Esta guía gobierna el **lenguaje**, no NestJS, React ni Laravel. Para DTOs Zod y naming usar [HTTP DTOs](../../standards/api/http-dtos-and-contracts.md) y [naming](../../standards/engineering/naming-and-boundaries.md). Mantener la convención Vigilio: métodos y funciones `camelCase`, variables/parámetros ordinarios y campos de datos `snake_case`, DI constructor `camelCase`, tipos/clases `PascalCase`.

## ✅ Correcto — tipado fuerte, safe input y valores derivados

```typescript
import { z } from 'zod';
const productSchema = z.object({ id: z.uuid(), estado: z.enum(['pendiente', 'anulado']) });
type ProductSchema = z.infer<typeof productSchema>;

function canCancel(product: ProductSchema): boolean {
  return product.estado === 'pendiente';
}
const result = productSchema.safeParse(raw_unknown);
if (!result.success) throw new InvalidProductError();
const id: ProductSchema['id'] = result.data.id;
```

## ❌ Incorrecto — any, assertions inseguras y uniones duplicadas

```typescript
function canCancel(product: any) { return product.estado === 'pendiente'; }
type ProductStatus = 'pendiente' | 'anulado'; // duplicado si existe ProductSchema
const product = await response.json() as ProductSchema; // dato externo sin validación
```

## Reglas de codificación vigentes

1. `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes` cuando el consumidor pueda sostenerlos; gate de migración si el código legado no compila.
2. Preferir `unknown` en bordes y narrowing con Zod/type guards; nunca `any` para evadir errores, y justificar `as` solo ante pruebas de invariantes o adaptación bien encapsulada.
3. `satisfies` para validar shape sin degradar inferencia; `as const` para literales (config/status) cuando sea necesario, no para esconder errores.
4. `type` para composición/uniones, `interface` para contratos extensibles/ports; evitar alias triviales `ProductId` si basta `ProductSchema['id']`.
5. Composiciones internas: `Pick`, `Omit`, intersecciones; no crear schema runtime nuevo cuando solo necesitamos tipo; DTO HTTP sí necesita validador en su archivo `.dto.ts`.
6. Funciones pequeñas, semánticas, puras cuando convenga; errores tipados/dominio; `Promise<...>` explícita en bordes públicos relevantes.
7. Preferir `for...of`, `map`, `reduce` según semántica; no dogma: medir performance y legibilidad. Usar `Promise.all` para concurrencia independiente con límite si hay mucha carga.
8. `AbortSignal` para I/O cancelable; timeouts y reintentos bounded en adaptadores, no dentro de Domain.
9. No mutar objetos compartidos accidentalmente; `Readonly`, clonación controlada y validación en boundaries.
10. `tsconfig` y module resolution coordinados con Vite/Node/toolchain; ESM/CJS no se mezclan sin adapter.
11. Secrets, authz y tenant no dependen del tipo TS. El código JS compilado no valida runtime por sí solo.
12. `noImplicitOverride` y lint exhaustivo cuando el stack lo soporte; los tests de tipo complementan unit e integración, no reemplazan ejecución.

## APIs antiguas y modernización

- Rechazar `namespace` para módulos nuevos de aplicación cuando ES modules resuelven el problema; conservar definiciones legacy de terceros sin reescritura ciega.
- Revisar `tsconfig` options descontinuadas y flags de compatibilidad al pasar a TS7. No inventar equivalentes: verificar [release notes TypeScript](https://devblogs.microsoft.com/typescript/) y migración del compilador.
- Evitar `//@ts-ignore` permanente y `skipLibCheck` como solución sistemática; documentar excepción con issue, owner y fecha.
- Evitar `enum` de TS si los estados ya derivan de schema Zod, salvo interoperabilidad o contratos externos justificados.
- `eslint/biome` aporta estilo; `tsc` comprueba tipos; `vitest` ejecuta comportamientos: ninguno sustituye a los otros.

## Gates y pruebas

```bash
pnpm exec tsc --noEmit
pnpm exec biome ci .
pnpm exec vitest run
```

Antes de actualizar a TS7 confirmar soporte de decorators NestJS, framework bundler, `@types/*`, generator/eslint/biome y `moduleResolution`; comparar ABI de tooling, build web/móvil y APIs publicadas. Reportar PASS / FAIL / BLOCKED / NOT_RUN con evidencia.

**Lecturas propietarias:** [versiones](../versions.md) · [arquitectura DDD](../../foundations/architecture/ddd.md) · [calidad](../../foundations/engineering/code-quality.md) · [Zod](../libraries/zod.md).


## Errores TypeScript modernos y cómo evitarlos en Vigilio

### 1. Resolver JSON como `unknown` en el borde

**❌ Incorrecto**

```typescript
const product = (await response.json()) as ProductSchema;
product.estado; // no hubo validación real del JSON recibido
```

**✅ Correcto** — en cliente público que valida respuestas según el contrato:

```typescript
const raw: unknown = await response.json();
const product: ProductSchema = productSchema.parse(raw);
```

No hacer `.parse()` por duplicado si `apiClient.requestJson` ya validó la respuesta una vez en el borde; si solo necesita tipado de una función confiable, inferir su tipo de retorno sin fingir validación.

### 2. Composición DRY y nombres

**✅ Correcto:**

```typescript
type ProductSummary = Pick<ProductSchema, 'id' | 'nro_poliza' | 'estado'>;
type ProductWithCategory = ProductSchema & { category: Pick<CategorySchema, 'id' | 'name'> };

export async function listProducts(query: ListProductsQueryDto): Promise<ListProductsResponseDto> {
  return apiClient.requestJson({ method: 'GET', path: '/products', query, responseSchema: listProductsResponseDto });
}
```

Los símbolos `ProductSchema`/`CategorySchema` son tipos inferidos de Zod, `*.dto.ts` tiene validador y tipo juntos; `ProductWithCategory` no exige un nuevo schema runtime si jamás cruza un borde desconocido.

**❌ Incorrecto:** alias `type ProductStatus = 'pendiente' | 'procesado'` cuando ya existe `ProductSchema['estado']`, o `type ProductId = string` sin restricción adicional.

### 3. Concurrencia, bucles y cancelación

```typescript
// ✅ Correcto: secuencial si la operación depende del resultado anterior.
for (const event of events) {
  await processEvent(event);
}

// ✅ Correcto: solicitudes independientes y acotadas a un lote pequeño.
await Promise.all(product_ids.slice(0, 10).map((product_id) => getProduct(product_id)));
```

`Promise.all` con 1 millón de entradas simultáneas satura conexiones. Si hay grandes lotes, limitar concurrencia con colas/worker. `AbortSignal`, `timeout` y retry se manejan en adaptadores y respetan idempotencia; no se implementan dentro de `ProductEntity`.

### 4. Reglas de compatibilidad con TS 7

- Validar TS 7.0.2 **con la versión instalada** de NestJS/Drizzle/React/Expo, herramientas de decorators y tipos.
- No pegar flags antiguos de `tsconfig` sin comparar release notes; al migrar registrar cambios de `moduleResolution`, imports ESM/CJS y soporte del runner.
- Evitar `@ts-ignore`, importación de internals, `any` y assertions para tapar errores sin dueño y fecha de eliminación.
- `typecheck` + unit + integración + contrato son gates distintos. Los fallos de runtime jamás se previenen únicamente con tipos TS.

[Fuente TypeScript 7](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/) · [Reglas globales de calidad](../../foundations/engineering/code-quality.md).
