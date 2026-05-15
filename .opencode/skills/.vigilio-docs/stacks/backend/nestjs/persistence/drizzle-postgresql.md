# NestJS: Drizzle + PostgreSQL con filtros y paginación reales

> **Referencia canónica actualizada:** [Drizzle sin alias redundantes](drizzle-conventions.md). Los fragmentos anteriores conservados tienen valor de procedencia; adoptar esta guía para nuevos cambios.

## Consultas en la frontera de infraestructura

Fijar condiciones de tenant/ACL de servidor; no aceptar columnas de ordenamiento arbitrarias del usuario. Usar SELECT de campos explícitos compatibles con `listProductsItemSchema`, no `select *` hacia DTO público.

```typescript
import { and, asc, count, desc, eq } from 'drizzle-orm';
const where = and(
  eq(products.tenant_id, tenant_id),
  query.estado ? eq(products.estado, query.estado) : undefined,
);
const rows = await db.select({
  id: products.id,
  nro_poliza: products.nro_poliza,
  product_type: products.product_type,
}).from(products).where(where)
  .orderBy(desc(products.created_at), desc(products.id))
  .limit(query.limit).offset(query.offset);
const [{ total }] = await db.select({ total: count() })
  .from(products).where(where);
```

Los nombres de columnas siguen el `schema.ts` concreto del consumidor: el ejemplo presupone `tenant_id`, `created_at`, etc. `total` cuenta registros filtrados, no tamaño de la página. `next`/`previous` derivan del total y el offset o cursores definidos; la paginación basada en offset requiere orden determinista y puede desfasarse con inserts concurrentes.

## Constraints y migraciones

Constraints únicas/foreign keys, transacciones para invariantes multirow, migraciones expand-contract y backfill controlado. Registrar latencia/redacción, limitar pool y documentar ruteo worker vs HTTP.

✅ Correcto: filtros y conteo comparten `WHERE`, orden estable y cláusula de autorización.

❌ Incorrecto: ignorar filtros del DTO, `count: rows.length` para total filtrado, `next:null` fijo, concatenar SQL interpolando valores del usuario.

Pruebas de integración con PostgreSQL real, casos A/B tenant y filtros combinados. [SQL Drizzle official](https://orm.drizzle.team/docs/select).

## Procedencia documental preservada

- [Capítulo heredado: 6-ejemplos-codigo.md](../http/references/6-ejemplos-codigo.md) — contenido íntegro conservado.
- [Capítulo heredado: 15-migrations-db.md](references/15-migrations-db.md) — contenido íntegro conservado.

## Mejoras técnicas verificables — 2026

**14. PostgreSQL sin N+1 y filtros correctos.** ✅ Proyectar columnas necesarias, filtrar por tenant, usar orden estable para paginación y testear `count/next/previous`. ❌ `count = rows.length` como total global, ignorar filtros DTO o hacer query por cada fila.

## Cobertura de implementación y evidencia (ampliación)

Estas comprobaciones concretan el tema de esta guía; aplicar solo las pertinentes al sistema consumidor y documentar exclusiones justificadas.

1. **Constraints:** Crear índices/unique/foreign key reales que respalden invariantes y filtros tenant.
2. **Projection:** Seleccionar solo columnas autorizadas por contrato; evitar `select *` en datos sensibles.
3. **Paginar:** Usar orden estable e índices; asegurar count coherente según aislamiento elegido.
4. **Transacciones:** No ejecutar publish externo antes del commit; probar rollback y concurrencia.
5. **Planes:** Verificar EXPLAIN/ANALYZE con datos representativos, no benchmark sobre 3 filas.
6. **Test:** Usar Postgres migrado en integración y comprobar scopes cross-tenant.

✅ **Correcto:** conservar el flujo funcional y demostrar criterios de aceptación con tests, trazas, revisión de contratos o un plan reproducible según el riesgo.

❌ **Incorrecto:** sustituir las reglas de negocio por un resumen, copiar implementaciones de otro framework, declarar cobertura sin evidencia o presentar `NOT_RUN` como `PASS`.

**Salida mínima:** responsable del control, riesgo cubierto, evidencia verificable y estado `PASS | FAIL | NOT_RUN | BLOCKED`. Los comandos de ejemplo son ilustrativos salvo que se adjunte ejecución real.

## Rendimiento de cargas masivas

Ver [bulk-ingest](bulk-ingest.md) para insert multirow y streaming; la [guía SQL compartida](../../../../standards/data/sql-performance.md) mantiene criterios de índices/EXPLAIN/VACUUM sin mezclar TypeScript y PHP. ✅ Medir el tamaño de lote. ❌ Ejecutar `forEach(async ...)` sobre un millón de filas.
