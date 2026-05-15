# NestJS + Drizzle — columnas snake_case sin repetir nombres SQL

[Estándar nombres](../../../../standards/engineering/naming-and-boundaries.md), [optimización SQL](../../../../standards/data/sql-performance.md) y [versiones](../../../../technology/versions.md). **Ejemplos no ejecutados**.

## Definición de tablas con inferencia de clave

```typescript
import { pgTable, uuid, varchar, timestamp, uniqueIndex, index } from 'drizzle-orm/pg-core';
export const products = pgTable('products', {
  id: uuid().primaryKey(),
  tenant_id: uuid().notNull(),
  nro_poliza: varchar({ length: 30 }).notNull(),
  created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex('products_tenant_policy_unique').on(table.tenant_id, table.nro_poliza),
  index('products_tenant_created_idx').on(table.tenant_id, table.created_at, table.id),
]);
```

El nombre físico lo deriva Drizzle de la clave cuando coinciden. **No** se requiere `uuid('tenant_id')` o `varchar('nro_poliza', ...)`. La forma sin nombre exige una versión de Drizzle compatible y lockfile validado; usar argumento explícito para mapear base preexistente con otro nombre. Revisar `drizzle-kit generate`, SQL generado, constraints y tipos reales antes de migrar; las definiciones anteriores no implican aplicar migraciones.

## Enums SQL derivados del schema propietario

Cuando los valores de `product_type` y `estado` tienen una única fuente Zod, el adaptador Drizzle los referencia sin reescribir el array de literales:

```typescript
// products/infrastructure/persistence/products.table.ts — fragmento del mismo módulo
import { pgEnum } from 'drizzle-orm/pg-core';
import { productSchema } from '../../domain/schemas/product.schema';
export const productTypeEnum = pgEnum('product_type', productSchema.shape.product_type.options);
export const productStatusEnum = pgEnum('product_status', productSchema.shape.estado.options);
// Dentro de pgTable('products', {...}):
// product_type: productTypeEnum().notNull(),
// estado: productStatusEnum().notNull(),
```

✅ **Correcto:** derivar los valores y revisar la migración SQL de PostgreSQL al cambiarlos. ❌ **Incorrecto:** crear un segundo enum TypeScript duplicado solo para Drizzle, o suponer que editar `productSchema` aplica la migración al servidor.

```typescript
// TypeScript: variables snake_case; query Drizzle tipada
import { and, eq, desc } from 'drizzle-orm';
async function listProducts(tenant_id: string, limit: number) {
  return db.select({ id: products.id, nro_poliza: products.nro_poliza })
    .from(products)
    .where(eq(products.tenant_id, tenant_id))
    .orderBy(desc(products.created_at), desc(products.id))
    .limit(limit);
}
```

✅ **Correcto:** `snake_case` en keys, args y variables; parámetros enlazados; SQL y API respetan tenant; proyecciones explícitas y resultado read model.

❌ **Incorrecto:** `products.tenant_id` cuando schema declara `tenant_id`, repetir nombres SQL idénticos, `select *` serializado, índices arbitrarios sin EXPLAIN, SQL concatenado con input externo.

## Rendimiento y validez de datos

1. **B-tree composite:** comprobar `WHERE tenant_id` + `ORDER BY created_at DESC, id DESC` con `EXPLAIN (ANALYZE, BUFFERS)`; evaluar dirección de índice/plan antes de afirmar mejora.
2. **Bulk 1M:** usar `COPY` a staging o `INSERT` acotado; medir lotes 250/500/1000/2000/5000; un millón de `.values()` por fila degrada round-trips. [Bulk](bulk-ingest.md).
3. **Conflictos:** `ON CONFLICT` requiere constraint; política de idempotencia por tenant/clave externa.
4. **Índices:** el nombre físico de índices puede ser explícito para identificarlo; la eliminación de alias de columnas no prohíbe nombres de constraints.
5. **Transacción/ACL:** comprobar visibilidad multitenant y escrituras concurrentes en PostgreSQL real; claims de tipado no prueban seguridad.
6. **Persistencia:** separar tabla Drizzle de `productSchema` de contrato y de agregado de dominio; definir mappers en Infrastructure.

**Pruebas pendientes:** migraciones/drizzle-kit, postgres container, integridad transaccional, límite SQL parámetros y performance bajo carga (`NOT_RUN`).
