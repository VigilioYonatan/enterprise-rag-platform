# HTTP, errores y paginación: contrato multilenguaje

**Alcance:** conservar la semántica y contratos paginados vigentes aquí; ver [Diseño REST de endpoints](rest-endpoint-design.md) para métodos, filtros avanzados, caché, concurrencia y operaciones asíncronas.

## Fronteras

Los parámetros HTTP son texto. `limit`, `offset` y otros numéricos deben convertirse mediante un schema o parser validado **antes** de entrar al caso de uso. No mezclar `z.input` con `z.output`. El DTO de respuesta describe el JSON efectivamente serializado (fecha ISO string, nunca `Date` en wire format).

```typescript
import { z } from 'zod';
export const paginationQueryValidator = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(25),
  offset: z.coerce.number().int().min(0).default(0),
});
export type PaginationQuery = z.output<typeof paginationQueryValidator>;
// En la frontera HTTP, solo: paginationQueryValidator.parse(req.query)
```

`z.coerce.number()` convierte `''` en 0: el rango `min(1)` protege `limit`, pero para campos que permitan 0, confirmar que el vacío debe rechazarse con preprocesamiento explícito. Usar un valor `default` no implica que venga de HTTP ya transformado.

## Respuesta y errores

- `count`: especificar si significa total filtrado o tamaño de página; en Vigilio preferir **total filtrado** si se expone ese nombre; mantener retrocompatibilidad con consumidores existentes.
- `next`/`previous`: URLs o cursores opacos coherentes; no asignar siempre `null` si existen páginas.
- Orden determinista: `createdAt DESC, id DESC` u otra clave estable y filtrado por tenant.
- Errores: estructura consistente, `traceId`, código estable, estado HTTP; no exponer SQL, stacktrace ni PII.
- 400 parámetros malformados; 401 no autenticado; 403 no autorizado; 404 según política anti-enumeración; 409 conflicto de estado; 422 cuando convención API/validación lo requiera; 429 límite.

✅ Correcto: `z.output` en application y `z.input` solo antes de parse; pruebas negativas de `limit=abc`, `limit=0`, `limit=101`, `limit=`.

❌ Incorrecto: `String(Number(query.limit))` antes de validar con `z.number`, ni `count=rows.length` para un contrato que promete total.

[Contrato fuente](contracts.md) · [ejemplos NestJS](../../stacks/backend/nestjs/http/dtos-zod.md).

## Procedencia documental preservada

- [Capítulo heredado: 6-ejemplos-codigo.md](../../stacks/backend/nestjs/http/references/6-ejemplos-codigo.md) — contenido íntegro conservado.
- [Capítulo heredado: 27-dtos-request-response.md](../../stacks/backend/nestjs/http/references/27-dtos-request-response.md) — contenido íntegro conservado.

> Fuente única para **Cobertura de implementación y evidencia (ampliación)**: [abrir documento canónico](../../governance/complete-work-coverage-policy.md).

## Contrato y semántica de paginación

- `count`: total de registros autorizados que cumplen los filtros, antes de aplicar `limit`/`offset`.
- `results`: elementos autorizados transformados al DTO público, sin campos secretos ni rows ORM.
- `next`/`previous`: URLs o cursores opacos según el contrato; no mezclar offsets y cursores bajo la misma semántica.
- Orden total y determinista al paginar (`created_at` + `id` como desempate) para evitar saltos y duplicados.
- Límite máximo y parámetros de query validados en el DTO HTTP; criterios internos no deben importar Zod/HTTP.

✅ **Correcto:** un DTO paginador genérico construido una vez y `Promise<PageResult<ProductSummary>>` dentro de Application.

❌ **Incorrecto:** retorno anónimo `Promise<{items,total,next,previous}>` en cada repositorio, contar otro tenant o confiar en `offset` negativo.

Para alto volumen usar [keyset pagination](../data/sql-performance.md) si el patrón de uso lo justifica; no exponer claves internas por accidente. Los DTO Zod se definen dentro de `*.dto.ts`: [contratos](http-dtos-and-contracts.md).
