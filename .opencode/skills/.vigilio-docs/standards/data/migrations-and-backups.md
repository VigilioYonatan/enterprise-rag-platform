# Migraciones y recuperación de datos: estándar compartido

## Expand-contract

1. Agregar campo/índice compatible hacia atrás.
2. Publicar código que pueda leer ambos estados y escribir el nuevo.
3. Backfill en lotes limitados, con métrica de avance y reintentos.
4. Verificar integridad; recién después contraer esquema con ventana de rollback.

## Resiliencia de BD

- Constraints e índices medidos; lock y duración de DDL antes de producción.
- Backup + restauración ejercitada (no solo comprobar que existe snapshot), RTO/RPO acordados, cifrado y aislamiento de cuenta.
- No ejecutar migraciones simultáneas desde todas las réplicas o workers.
- Parches PostgreSQL/Drizzle/Eloquent deben respetar locks y transacciones concretos del driver.

✅ Correcto: rollback ensayado y restauración de muestra con validación de claves/índices.

❌ Incorrecto: eliminar columna en primer despliegue o ejecutar `DROP TABLE` no reversible durante canary.

Implementación: [NestJS](../../stacks/backend/nestjs/persistence/transactions-migrations.md) y [Laravel](../../stacks/backend/laravel/persistence/transactions.md).

## Procedencia documental preservada

- [Capítulo heredado: 15-migrations-db.md](../../stacks/backend/nestjs/persistence/references/15-migrations-db.md) — contenido íntegro conservado.
- [Capítulo heredado: 17-backup-restore-dr.md](references/17-backup-restore-dr.md) — contenido íntegro conservado.

> Fuente única para **Cobertura de implementación y evidencia (ampliación)**: [abrir documento canónico](../../governance/complete-work-coverage-policy.md).

## Cambios expand/contract sin parar consumidores

1. **Expand:** agregar columna nullable o tabla nueva e índices concurrentes cuando el motor y la migración lo permitan.
2. Desplegar writers/readers capaces de convivir con schema antiguo y nuevo; no renombrar ni eliminar campos consumidos.
3. Backfill en lotes con checkpoints, límite de throughput, métricas de WAL/locks y reintentos idempotentes.
4. Validar integridad, conteos por tenant y compatibilidad de API y eventos antes de **contract**.
5. Retirar columnas antiguas solo cuando las versiones de aplicación/worker y rollback estén aprobadas.

✅ **Correcto:** migración compatible + prueba de restore + test de rollback de aplicación.

❌ **Incorrecto:** hacer `DROP COLUMN` antes de desplegar consumidores o ejecutar un backfill de millones de filas en una sola transacción por defecto.

**Evidencia específica:** tiempo de bloqueo, duración y checksum del backup, RPO/RTO medidos y resultado de restaurar PostgreSQL en un entorno aislado. El procedimiento operativo queda en [SRE backup](../../platform/sre/backup-disaster-recovery.md) y las optimizaciones en [SQL performance](sql-performance.md).

## Integración del Master histórico modernizado

Para cambiar asociaciones con múltiples destinos, seguir [polimorfismo relacional seguro](polymorphic-relations.md): no degradar FKs reales a `target_type/target_id` sin ADR y controles compensatorios. Antes de contraer columnas, medir huérfanos, integridad tenant y consumidores de migraciones anteriores.

**Golden gate DB:** inventario del esquema esperado y real, estado/checksum de migraciones del sistema consumidor, muestra de compatibilidad con código viejo/nuevo, prueba de restauración y de rollback operativo. La mera presencia de la tabla de migraciones **no** confirma ausencia de drift; ningún preflight puede sustituir esos checks.

✅ Correcto: probar en PostgreSQL real una FK tenant compuesta y backfill idempotente. ❌ Incorrecto: dar por aprobada una migración solo porque `SELECT 1` responde.
