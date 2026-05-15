# NestJS: Repository Ports y DTOs de lectura

> **Referencia canónica actualizada:** [Puertos con `ProductSchema['id']`](../architecture/schema-derived-types.md) · [Drizzle snake_case](../persistence/drizzle-conventions.md). Los fragmentos anteriores conservados tienen valor de procedencia; adoptar esta guía para nuevos cambios.

Separar contrato de persistencia (ports) de implementación Drizzle. Los ports hablan en términos del dominio o de read models, nunca de `NodePgDatabase`, decorators HTTP ni `Response` de Express.

```typescript
// shared/application/types/page-result.type.ts: DEFINIR UNA VEZ
import type { z } from 'zod';
import { paginatorMetaDto } from '../schemas/paginator.schema';
export type PageResult<TItem> = z.infer<typeof paginatorMetaDto> & {
  results: TItem[];
};
```

```typescript
// products/application/ports/product.repository.ts
import type { ProductSchema } from '../../domain/schemas/product.schema';
import type { PageResult } from '@/shared/application/types/page-result.type';
export type ProductReadItem = Pick<ProductSchema, 'id' | 'nro_poliza' | 'product_type'>;
export type ProductSearchCriteria = {
  tenant_id: ProductSchema['tenant_id']; // obtenido de identidad autorizada
  filters: ProductListFilters; // tipo interno autorizado, nunca DTO HTTP
};

export interface ProductReadRepository {
  findByCriteria(criteria: ProductSearchCriteria): Promise<PageResult<ProductReadItem>>;
}

export interface ProductRepository {
  findById(product_id: ProductSchema['id'], tenant_id: ProductSchema['tenant_id']): Promise<ProductSchema | null>;
  save(product: ProductSchema): Promise<void>;
}
```

`PageResult<TItem>` se declara **solo una vez** en shared como estructura interna del puerto; el contrato HTTP se define con `createPaginatorDto(productSchema.pick(...))` en el `*.response.dto.ts`. Evita un objeto de retorno anónimo dentro del método y evita que Application dependa de `Presentation`. Deben mantener el mismo shape (`count`, `next`, `previous`, `results`) y verificarse con pruebas de contrato. Nest requiere un token DI de runtime para inyectar interfaces; el token no se infiere desde TypeScript.

✅ Correcto: repository recibe scope tenant y resultados tipados; tests del adaptador contra PostgreSQL real.

❌ Incorrecto: `findAll()` sin tenant en una aplicación multitenant, repository que devuelve `HttpStatus.OK` o `success: true` desde SQL.

[Drizzle](../persistence/drizzle-postgresql.md), [DI](../architecture/dependency-injection.md).

## Procedencia documental preservada

- [Capítulo heredado: 2-arquitectura.md](../architecture/references/2-arquitectura.md) — contenido íntegro conservado.
- [Capítulo heredado: 6-ejemplos-codigo.md](../http/references/6-ejemplos-codigo.md) — contenido íntegro conservado.

## Cobertura de implementación y evidencia (ampliación)

Estas comprobaciones concretan el tema de esta guía; aplicar solo las pertinentes al sistema consumidor y documentar exclusiones justificadas.

1. **Contrato estable:** Declarar inputs del caso de uso y retorno de modelos de dominio/lectura, no tipos ORM.
2. **Lecturas:** Separar filtro de tenant/ACL y paginación estable en puerto especializado.
3. **Errores:** Modelar not found/conflicto/transitorio sin filtración del driver.
4. **Persistencia:** Probar una implementación con Postgres real sin alterar dominio.
5. **Determinismo:** Establecer orden estable cuando la paginación usa cursor.
6. **Antiacoplamiento:** Rechazar import de Drizzle en Application/Domain.

✅ **Correcto:** conservar el flujo funcional y demostrar criterios de aceptación con tests, trazas, revisión de contratos o un plan reproducible según el riesgo.

❌ **Incorrecto:** sustituir las reglas de negocio por un resumen, copiar implementaciones de otro framework, declarar cobertura sin evidencia o presentar `NOT_RUN` como `PASS`.

**Salida mínima:** responsable del control, riesgo cubierto, evidencia verificable y estado `PASS | FAIL | NOT_RUN | BLOCKED`. Los comandos de ejemplo son ilustrativos salvo que se adjunte ejecución real.
