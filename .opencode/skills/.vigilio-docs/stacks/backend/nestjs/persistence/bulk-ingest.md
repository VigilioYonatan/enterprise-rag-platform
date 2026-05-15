# NestJS + Drizzle: escritura masiva, streaming y backpressure

Esta guía es específica de **TypeScript / Drizzle**. La norma general SQL es [SQL performance](../../../../standards/data/sql-performance.md). Consultar [technology/versions.md](../../../../technology/versions.md) antes de elegir API concreta del driver.

## Multirow en lotes

```typescript
const batch_size = 1000;

for await (const batch of readProductsInBatches(batch_size)) {
  // productsTable: schema de tabla Drizzle, distinto de productSchema de Zod.
  // Validar inputs externos antes de este límite de persistencia.
  await db.insert(productsTable).values(batch);
}
```

`readProductsInBatches` es un iterador async a implementar, no una API Drizzle. No crear una lista de un millón de objetos en memoria. Derivar tipos de datos externos de schemas Zod; un dominio existente mantiene sus invariantes. Drizzle deduce columnas snake_case sin repetirlas cuando coinciden con las claves del schema.

## Upsert idempotente

```typescript
await db.insert(productsTable)
  .values(batch)
  .onConflictDoUpdate({
    target: [productsTable.tenant_id, productsTable.external_id],
    set: { nro_poliza: sql`excluded.nro_poliza` },
  });
```

Ejemplo ilustrativo: requiere `UNIQUE (tenant_id, external_id)`, import `sql` de `drizzle-orm` y un batch validado con esas propiedades; si `excluded` se compone en SQL, no insertar strings provenientes de usuarios sin parámetros. No usar conflictos ignorados cuando representan violación de negocio.

## COPY y concurrencia

Para grandes volúmenes, usar protocolo COPY del **driver PostgreSQL** con streams hacia staging, siempre que el driver elegido lo soporte; no atribuir COPY a `db.insert` de Drizzle. Medir bytes por lote/statement, WAL, cantidad de binds, consumo de memoria y p95 de peticiones. Establecer un número máximo acotado de workers y usar un checkpoint persistente por importación.

## Validación

- ✅ Correcto: lotes medidos, tenant desde autorización, `ON CONFLICT` con UNIQUE real y reanudación idempotente.
- ✅ Correcto: evitar trabajo de red dentro de transacciones; separar comandos semánticos de infraestructura bulk.
- ❌ Incorrecto: `Promise.all` sobre 10000 lotes sin límite; `forEach(async ...)` sin await.
- ❌ Incorrecto: afirmar `PASS` sin test de integración con PostgreSQL real y carga representativa.

**Gate:** throughput, duplicados, autorización, rollback, RAM, WAL, locks, latencia p95 y recuperación después de crash. Resultado inicial: `NOT_RUN`.
