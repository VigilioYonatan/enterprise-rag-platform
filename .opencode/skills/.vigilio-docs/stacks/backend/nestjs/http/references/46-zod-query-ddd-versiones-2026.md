# Contratos HTTP, DDD pragmático y versiones estables — 23 octubre 2026

> **Regla vigente:** Zod y `z.output` comparten **un solo `*.dto.ts`**. No crear `*.validator.ts` en código nuevo; ejemplos históricos se conservan por trazabilidad. [Norma](../../../../../standards/api/http-dtos-and-contracts.md).


> **PRECEDENCIA — cambios 2026-10-25:** Este capítulo es **histórico**, no plantilla vigente de nombres/rutas. Las entradas HTTP nuevas usan un único `*.dto.ts` con Zod y tipo inferido; entidades en `domain/schemas/` con `ProductSchema` / `OrderSchema`, métodos `OrderEntity.cancel()` y casos de uso `cancelOrder()`. Consultar [norma vigente](../../../../../standards/api/http-dtos-and-contracts.md). Conservar el resto del capítulo como contexto, sin copiar los fragmentos anteriores como nuevos estándares.

> Documento incremental. No reemplaza `20-reglas-senior-codigo.md`, `21-golden-path-feature.md`,
> `6-ejemplos-codigo.md` ni `43-backend-technologies-skill-2026.md`. En caso de contradicción
> sobre **queries, nombres de casos de uso o elegibilidad NestJS 12**, aplicar esta actualización
> explícita y contrastar siempre con el repositorio consumidor y sus tests.

## A. Query strings numéricos con Zod 4

HTTP transporta `limit=25&offset=0` como strings; el caso de uso debe recibir números **validados**.
El schema compartido hace una sola normalización. El pipe solo valida:

```typescript
import { z } from 'zod';

const unsignedQueryInteger = z.string()
  .regex(/^(0|[1-9]\d*)$/, 'Expected an unsigned decimal integer')
  .pipe(z.coerce.number<string>().int());

export const listProductsQueryDto = z.object({
  limit: unsignedQueryInteger.pipe(z.number().positive().max(100)).default(25),
  offset: unsignedQueryInteger.pipe(z.number().min(0)).default(0),
  search: z.string().optional(),
});

export type ListProductsQueryWire = z.input<typeof listProductsQueryDto>;
export type ListProductsQueryDto = z.output<typeof listProductsQueryDto>;
```

`z.coerce.number()` es válido para coerción intencional más amplia, pero acepta conversiones JS
como `'' -> 0`; utilizar una precondición léxica cuando sea necesario. Alternativamente,
`.transform(Number).pipe(z.number().int()...)` con la misma validación léxica.
No aplicar coerción global a strings: IDs opacos, códigos con ceros y dinero exacto siguen strings.

```typescript
// Infraestructura HTTP. No necesita conocer limit ni offset.
transform(value: unknown): ListProductsQueryDto {
  const result = listProductsQueryDto.safeParse(value);
  if (!result.success) throw new BadRequestException('Invalid query');
  return result.data;
}
```

Comportamiento esperado:

| Entrada HTTP | Resultado |
|---|---|
| `?limit=25&offset=0` | `{ limit:25, offset:0 }` |
| sin `limit` ni `offset` | defaults `{ limit:25, offset:0 }` |
| `?limit=` | 400 |
| `?offset=-1` | 400 |
| `?offset=1e3` | 400 |
| `?limit=101` | 400 |
| `?offset=9007199254740992` | 400 (fuera de entero seguro) |

La compatibilidad de pipes/transforms con el generador OpenAPI se debe verificar contra la
**versión instalada**. El HTTP contract describe strings numéricos a nivel transporte,
y números a nivel de aplicación. No cambiar el DTO sin diff de OpenAPI.

## B. Casos de uso con nombres del dominio

✅ También en operaciones sencillas usar métodos semánticos (`listProducts()`, `getProduct()`, `registerProduct()`). En operaciones con invariantes usar `approvePolicy()`, `cancelOrder()`, `activateSubscription()` y `calculatePremium()` cuando corresponda. ❌ No imponer `index/show/store/update/destroy` como nuevos métodos. Separar cada `*.schema.ts` y el tipo `*.dto.ts`; no clonar responses iguales.

```text
HTTP Controller -> CancelOrderApplicationService.cancelOrder(orderId)
                -> OrderAggregate.cancelOrder()  # invariante/estado
                -> OrderRepository.save(order)   # port: dominio, no DTO HTTP
                -> OrderCancelResponseDto        # Zod compartido con frontend
```

No forzar `domain/` para CRUD sin comportamiento; no devolver filas Drizzle como contrato
público. Proyectar explícitamente los campos permitidos. `operationId` semántico y estable;
cambiarlo requiere revisión de compatibilidad de clientes generados.

## C. Una fuente de verdad Zod para backend, Scalar y frontend

```typescript
export const listProductsItemSchema = productSchema.pick({
  id: true,
  nro_poliza: true,
  product_type: true,
});
export const listProductsResponseDto = createPaginatorDto(listProductsItemSchema);
export type ListProductsResponseDto = z.infer<typeof listProductsResponseDto>;
```

- Backend: `Promise<ListProductsResponseDto>`; sin `responseDto.parse()` redundante por defecto.
- Swagger/Scalar: `*DocDto` derivado del schema, decorador OpenAPI que no active un interceptor
  de validación de respuestas si no está explícitamente solicitado.
- Frontend propio controlado: contrato compartido para `getJson<ListProductsResponseDto>()`
  sin validación runtime por defecto, respaldado por tests de contrato, CI y `openapi:diff`.
- `as ListProductsResponseDto` no es validación runtime. APIs externas o datos de alto riesgo:
  habilitar validación explícita una vez en el borde.
- `.pick()` limita el **tipo/schema**, no elimina campos de una respuesta cuando no se hace `parse()`:
  construir una proyección real en SQL/mapper para no enviar secretos ni columnas internas.
- DTO JSON de fechas describe strings ISO; el modelo persistido o dominio puede usar `Date`.

## D. Cache: invalidación correcta

`DEL('product:index:*')` **no** elimina un patrón: Valkey/Redis trata el valor como key literal.
Para registros, `DEL` de clave exacta tras commit; para listados, generación de namespace con
`INCR` atómico (adapter real) + TTL de claves viejas. Ver `9-cache.md`. La invalidación necesita
garantías operativas de retry o desactivar cache si el caso de uso exige consistencia fuerte.

## E. Tecnología estable y compatibilidad verificable

Fecha de comprobación: **2026-10-23**.

| Superficie | Línea estable verificada / regla |
|---|---|
| Node.js | 24 LTS baseline actual de la arquitectura; patch real del runtime y CI |
| NestJS | **12.2.0 estable** (release del 2026-10-19); NestJS 11 sigue siendo baseline de consumidores que aún no migraron |
| Zod | **4.x estable**; versión exacta del lockfile; no beta/canary |
| `nestjs-zod`, `@nestjs/swagger`, Scalar | Verificar compatibilidad exacta con NestJS 12 y Zod 4; no asumir soporte de una nueva major |
| Drizzle ORM | Usar solo API de la versión estable resuelta; no copiar API de 1.0 RC sobre 0.x |
| PostgreSQL y Valkey | Versión materializada por plataforma / driver; no afirmar upgrades sin manifiestos e integraciones |

Fuentes oficiales: [Nest releases](https://github.com/nestjs/nest/releases),
[Zod 4](https://zod.dev/v4), [Node releases](https://nodejs.org/en/about/previous-releases).

**Gate de actualización del framework:** comprobar `package.json` + lockfile + Node engine,
matriz Nest/Zod/Swagger y adaptador HTTP; actualizar solo mediante PR con `pnpm typecheck`,
tests unit/integration/E2E, `openapi:export`, `openapi:diff`, seguridad y rollback.
Una release estable no autoriza actualizar las dependencias de un proyecto automáticamente.
La fuente de verdad ejecutable para versiones aprobadas sigue siendo la policy publicada por
`vigilio-platform-actions` y el lockfile del consumidor, no esta nota de arquitectura.

## ✅ Correcto / ❌ Incorrecto: revisión 2026

- ✅ **Correcto:** Derivar proyecciones de un esquema canónico (`productSchema.pick()`/OpenAPI), documentar valores opcionales y comprobar compatibilidad en CI.
- ❌ **Incorrecto:** Copiar DTOs por controller o interpretar `as T` como validación runtime; usar `.parse()` repetidamente sólo para obtener el tipo.
- **Al recibir código existente:** primero caracterizar el comportamiento, después refactorizar en pasos comprobables. [Guía canónica de modernización](../../../../../standards/engineering/refactoring-existing-code.md).

> **Referencia histórica completa, migrada sin recortes de contenido técnico.** La norma vigente corresponde a `foundations/` y `standards/`; las especializaciones NestJS están en `stacks/backend/nestjs/`. Ante contradicciones, seguir documentación canónica y pruebas del proyecto. Los enlaces relativos se actualizaron para mantener la navegación.

✅ **Correcto:** aplicar la normativa compartida y adaptar estos ejemplos tras comprobar versiones.

❌ **Incorrecto:** copiar ciegamente un fragmento histórico o imponer reglas de NestJS a Laravel.
