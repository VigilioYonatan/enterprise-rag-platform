# SQL y PostgreSQL — optimización integral sin atajos

> **Referencia canónica actualizada:** [Naming y DDD](../engineering/naming-and-boundaries.md) · [gate de pruebas](../testing/semantic-ddd-contract-gates.md). Los fragmentos anteriores conservados tienen valor de procedencia; adoptar esta guía para nuevos cambios.

**Alcance:** SQL relacional, con ejemplos y notas específicas de PostgreSQL. Es norma compartida: no importar aquí código Laravel ni NestJS. Las implementaciones por framework están en sus respectivos stacks. Ver [versiones](../../technology/versions.md).

## Principios no negociables

- ✅ **Correcto:** medir con datos representativos, preservar integridad, aplicar una optimización a la vez y demostrar mejora sin degradar p95 de otros usuarios.
- ❌ **Incorrecto:** asumir que `batch_size = 1000` es óptimo, quitar índices/FK de tablas vivas a ciegas, silenciar WAL o ejecutar `VACUUM FULL` como mantenimiento diario.
- **Clasificación:** usar `PASS | FAIL | NOT_RUN | BLOCKED` para pruebas; ejemplos siguientes son **orientativos, no ejecuciones reales**.

## Decisión rápida para cargar 1.000.000 de filas

| Contexto | Patrón recomendado | Condición de aceptación |
|---|---|---|
| Archivo o stream masivo | `COPY` preferentemente a staging | throughput, memoria, WAL, reconciliación |
| API/worker con datos ya tipados | Multirow `INSERT` por lotes medidos | p95 OLTP no se degrada; límites de binds |
| Carga repetible/upsert | Staging + `INSERT ... ON CONFLICT` | idempotencia y UNIQUE real |
| Backfill de tabla activa | Cursor estable, lotes cortos, throttle | sin bloqueos largos; reanudable |

### Comparación y tamaño de lote

1. Comparar `COPY`, lotes de 250, 500, 1000, 2000 y 5000 filas, y registrar memoria, tamaño por fila, binds, WAL, round-trips y duración.
2. Una transacción gigante ofrece atomicidad global pero retiene recursos más tiempo; confirmar si la operación requiere todo-o-nada o confirmaciones por lote.
3. Para datos externos, validar primero, registrar filas rechazadas por motivo, procesar desde stream y preservar cursor/checksum por importación.
4. `COPY` es optimizado para grandes cargas, pero para validar, deduplicar y aplicar permisos suele convenir staging + publicación transaccional.

```sql
-- Ejemplo: multirrow y deduplicación idempotente con UNIQUE (tenant_id, external_id).
INSERT INTO products (tenant_id, external_id, nro_poliza)
VALUES ($1, $2, $3), ($4, $5, $6)
ON CONFLICT (tenant_id, external_id)
DO UPDATE SET nro_poliza = EXCLUDED.nro_poliza;

-- Verificación de un SELECT; usar ANALYZE únicamente en consulta segura
EXPLAIN (ANALYZE, BUFFERS)
SELECT id, nro_poliza FROM products
WHERE tenant_id = $1 ORDER BY created_at DESC, id DESC LIMIT 25;
```

Nota: el `ON CONFLICT` presupone el índice UNIQUE apropiado. `EXPLAIN ANALYZE` ejecuta el SQL: una sentencia de escritura requiere rollback/entorno de pruebas para no causar cambios. Para un `COPY` real hay que usar archivo o protocolo streaming del cliente.

## Inventario integral de prácticas

Cada fila incluye **qué hacer**, **cuándo sirve** y **cómo demostrarlo**; no es un ranking ficticio ni hay que aplicar todas a la vez.

### 01 · Ingesta y escrituras masivas

| # | Práctica | Qué hacer / cuándo | Evidencia mínima |
|---:|---|---|---|
| 1 | **Multirow INSERT** | Agrupa filas en un `INSERT ... VALUES (...), (...)` en lugar de enviar una sentencia por fila. | Comparar filas/s, round-trips y errores por lote. |
| 2 | **Micro-lotes acotados** | Probar 250/500/1000/2000/5000 filas de acuerdo con bytes/filas y cantidad de columnas; ninguna cifra es universal. | Registrar p50/p95 de duración y memoria de cada lote. |
| 3 | **COPY streaming** | Preferir `COPY FROM STDIN` para millones de registros provenientes de un archivo o stream. | Medir filas/s, WAL y tiempo total frente a multirow. |
| 4 | **Staging con constraints** | Cargar a tabla staging aislada, validar y publicar mediante `INSERT ... SELECT` o `MERGE` cuando haya transformaciones. | Reconciliar totales, duplicados y filas rechazadas. |
| 5 | **UPSERT idempotente** | Emplear `ON CONFLICT` con índice UNIQUE correcto al reprocesar eventos/importaciones. | Ejecutar dos veces el mismo lote y confirmar conteo/valores. |
| 6 | **INSERT SELECT set-based** | Mover/transformar datos dentro de la base con una sentencia set-based en vez de transportar cada fila por la aplicación. | Comparar tiempo, transferencias y corrección semántica. |
| 7 | **Bounded retries** | Reintentar únicamente fallos transitorios con backoff y jitter; registrar lote/clave idempotente. | Simular timeout y confirmar ausencia de duplicación. |
| 8 | **Checkpoint de progreso** | Persistir cursor/offset de origen, lote confirmado, suma de control y errores recuperables. | Reanudar tras caída y comprobar exactamente qué quedó confirmado. |
| 9 | **Backpressure del productor** | Regular generación/importación por throughput sostenible, no inundar la cola ni conexiones. | Monitorizar lag, memoria, WAL y latencia OLTP. |
| 10 | **Evitar cargar 1M en RAM** | Producir/consumir mediante iteradores, streams o colas de capacidad acotada. | Perfil de memoria estable al multiplicar volumen. |

### 02 · Transacciones y concurrencia

| # | Práctica | Qué hacer / cuándo | Evidencia mínima |
|---:|---|---|---|
| 11 | **Transacciones cortas** | Agrupar operaciones que deben ser atómicas, evitando llamadas HTTP y esperas dentro de la transacción. | Observar duración de transacciones y locks. |
| 12 | **Límite de lote transaccional** | Distinguir atomicidad del negocio de un millón de filas vs transacciones por lote; no fragmentar una operación que requiere all-or-nothing sin diseño. | Probar fallos en mitad de importación y rollback. |
| 13 | **Orden estable de escrituras** | Bloquear/actualizar filas en orden determinista para reducir deadlocks concurrentes. | Reproducir carga con escritores simultáneos. |
| 14 | **Optimistic locking** | Usar `version` o condición de estado en `UPDATE ... WHERE version = ...`. | Comprobar que solo uno de dos escritores gana. |
| 15 | **Pessimistic locking** | Aplicar `SELECT ... FOR UPDATE` solo cuando las invariantes lo justifican. | Medir esperas y ausencia de transiciones inválidas. |
| 16 | **SKIP LOCKED workers** | Repartir jobs con `FOR UPDATE SKIP LOCKED` en colas diseñadas sobre tablas. | Dos workers no procesan el mismo job al mismo tiempo. |
| 17 | **Timeout de locks** | Configurar `lock_timeout` y `statement_timeout` por tipo de trabajo, evitando esperas indefinidas. | Simular lock y verificar tratamiento del error. |
| 18 | **Isolation level consciente** | Elegir Read Committed/Repeatable Read/Serializable por anomalía que se debe prevenir. | Test concurrente reproduce y elimina la anomalía. |
| 19 | **Outbox transaccional** | Persistir cambio de negocio + evento de outbox en la misma transacción; despachar fuera. | Caída después del COMMIT no pierde evento. |
| 20 | **Limitar escrituras simultáneas** | No lanzar 100 workers que compitan por los mismos índices/locks solo por tener más CPU. | Comparar throughput y p95 con distintas concurrencias. |

### 03 · Consultas, joins y lectura

| # | Práctica | Qué hacer / cuándo | Evidencia mínima |
|---:|---|---|---|
| 21 | **EXPLAIN real** | Usar `EXPLAIN (ANALYZE, BUFFERS)` con datos representativos; precaución: ejecuta la sentencia. | Comparar actual rows, loops, buffer hits/reads y tiempos. |
| 22 | **Evitar SELECT *** | Seleccionar solo columnas necesarias, especialmente tablas anchas. | Medir bytes transferidos y heap fetches. |
| 23 | **Eliminar N+1** | Cargar relaciones por join, eager loading o consultas en bloque cuando convenga. | Instrumentar número de consultas por request. |
| 24 | **WHERE indexable** | No envolver columna indexada en función si puede aplicarse filtro por rango equivalente. | Verificar uso de índice y filas filtradas. |
| 25 | **Keyset pagination** | Para páginas profundas y cursores, filtrar por última clave ordenada e índice compatible. | Medir página 1 frente a página 100000. |
| 26 | **ORDER BY determinista** | Añadir clave de desempate única (`created_at`, `id`) para que el cursor no salte filas. | Probar inserciones entre páginas. |
| 27 | **Agrupar en SQL** | Hacer SUM/COUNT/GROUP BY en la base en vez de descargar todas las filas a PHP/TS. | Comprobar igualdad y tráfico reducido. |
| 28 | **Evitar OFFSET profundo** | Usar offset para UI superficial; cursor para navegación/escaneo intensivo. | Comparar scans y latencia por profundidad. |
| 29 | **Evitar OR costoso** | Revisar OR amplios, condiciones alternativas e índices; considerar UNION ALL solo si semántica y plan mejoran. | Comparar EXPLAIN sin alterar duplicados. |
| 30 | **No asumir seq scan malo** | Para tablas pequeñas o filtros poco selectivos, seq scan puede ser óptimo. | Comparar estimación/realidad antes de forzar índices. |

### 04 · Índices y acceso a datos

| # | Práctica | Qué hacer / cuándo | Evidencia mínima |
|---:|---|---|---|
| 31 | **B-tree por consultas** | Indexar las columnas de WHERE/JOIN/ORDER BY frecuentes y selectivas. | Inspeccionar plan y coste de escritura. |
| 32 | **Orden de índice compuesto** | Diseñar índices `(tenant_id, created_at, id)` por filtros y orden predominante. | Comprobar query real con tenant y orden. |
| 33 | **Índice parcial** | Indexar solo subconjunto consultado (`WHERE status = pending`) si patrón estable. | Comprobar selectividad y tamaño. |
| 34 | **Índice INCLUDE** | Añadir columnas de proyección con INCLUDE cuando index-only scan sea útil sin hinchar clave. | Comprobar Heap Fetches y espacio. |
| 35 | **Índice funcional** | Indexar `lower(email)` si el filtro siempre usa `lower(email)`. | Confirmar uso por query exacta. |
| 36 | **GIN para JSONB** | Indexar operadores frecuentes de JSONB/arrays/full-text, no todos los JSON por defecto. | Probar predicados concretos y tamaño. |
| 37 | **BRIN para grandes tablas** | Evaluar BRIN si columna temporal/correlacionada crece físicamente ordenada. | Medir tamaño/latencia vs B-tree. |
| 38 | **Evitar sobreindexado** | Cada índice agrega trabajo y WAL a INSERT/UPDATE/DELETE. | Auditar índices redundantes/usados. |
| 39 | **CREATE INDEX CONCURRENTLY** | En tablas activas, considerar construcción concurrente y sus limitaciones transaccionales. | Medir impacto de bloqueos y plan de rollback. |
| 40 | **Constraints antes que código** | Usar UNIQUE, FK, CHECK y NOT NULL para invariantes persistentes. | Probar inserciones inválidas/concurrentes. |

### 05 · Modelo, particionado y datos

| # | Práctica | Qué hacer / cuándo | Evidencia mínima |
|---:|---|---|---|
| 41 | **Tipos adecuados** | UUID/INTEGER/NUMERIC/TIMESTAMPTZ según dominio; no almacenar números/fechas como texto. | Verificar casts, tamaño y rangos. |
| 42 | **Normalización por defecto** | Reducir duplicidad y anomalías; desnormalizar solo para lectura medible. | Validar consistencia tras actualizaciones. |
| 43 | **Diseñar PK y UNIQUE** | Elegir claves estables, evitar actualizaciones masivas de PK. | Revisar conflictos, tamaño de índices. |
| 44 | **Particionar por ciclo de vida** | Usar RANGE temporal si facilita pruning/retención sobre conjuntos masivos. | EXPLAIN evidencia partition pruning. |
| 45 | **No particionar por reflejo** | Tablas medianas o consultas sin clave de partición pueden empeorar. | Comparar coste operativa y planes. |
| 46 | **Retención por partición** | Eliminar particiones caducas cuando el negocio lo permita, evitando DELETE masivo. | Auditar retención y referencias. |
| 47 | **JSONB con criterio** | Usar columnas tipadas para campos usados en joins/constraints; JSONB para extensiones justificadas. | Probar consultas y schema evolution. |
| 48 | **Columnas de auditoría** | created_at/updated_at, actor, correlación y políticas de retención según dominio. | Reconciliar mutaciones y normativas. |
| 49 | **Aislamiento tenant** | Incluir tenant_id en filtros/índices y reforzar RLS cuando corresponda. | Pruebas negativas entre tenants. |
| 50 | **Modelo de lotes** | Registrar import_job, estado, suma de control, filas aceptadas/rechazadas, etapa y motivo. | Reconstruir importación y auditar sin logs enormes. |

### 06 · Mantenimiento y estadísticas

| # | Práctica | Qué hacer / cuándo | Evidencia mínima |
|---:|---|---|---|
| 51 | **Autovacuum activado** | No desactivar autovacuum en producción para ganar velocidad temporal. | n_dead_tup, last_autovacuum y crecimiento. |
| 52 | **ANALYZE post carga** | Actualizar estadísticas tras cargas grandes o cambio de distribución. | Planes después de ANALYZE. |
| 53 | **VACUUM vs VACUUM FULL** | VACUUM rutinario; FULL solo con ventana y entendiendo ACCESS EXCLUSIVE. | Tamaño y bloqueos observados. |
| 54 | **Detectar bloat** | Medir crecimiento muerto de tablas e índices, no reindexar todo por rutina. | Tamaños, dead tuples y uso. |
| 55 | **Tune por tabla** | Ajustar thresholds autovacuum para tablas con alto churn y tablas pequeñas. | Ciclo de vacuum cumple SLO. |
| 56 | **Estadísticas extendidas** | Usar CREATE STATISTICS cuando correlaciones multicolumna causan estimaciones malas. | Comparar estimated vs actual rows. |
| 57 | **Reindex con criterio** | REINDEX CONCURRENTLY si procede y previa evaluación de bloqueo/capacidad. | Comparar índice antes/después. |
| 58 | **Tablas temporales** | ANALYZE manual para tablas temporales importantes, no son atendidas por autovacuum. | Plan mejorado de joins temporales. |

### 07 · Recursos, conexiones y WAL

| # | Práctica | Qué hacer / cuándo | Evidencia mínima |
|---:|---|---|---|
| 59 | **Pool acotado** | Sumar conexiones de todas las réplicas/workers antes de definir pool; evitar exceso. | Conexiones activas, idle y saturación. |
| 60 | **PgBouncer cuando conviene** | Evaluar pooler para muchas conexiones cortas y compatibilidad con prepared statements. | Menor overhead y sin regresión de sesión. |
| 61 | **work_mem contextual** | work_mem es por nodo de orden/hash y consulta; aumentarlo globalmente puede agotar RAM. | Sort Method/Hash Batches, RAM y concurrencia. |
| 62 | **maintenance_work_mem cargas** | Ajustarlo para construir índices/FK; no asumir que acelera COPY directamente. | Tiempo de CREATE INDEX con uso de memoria. |
| 63 | **max_wal_size bulk** | Si hay checkpoints frecuentes durante COPY, considerar tuning limitado y monitoreado. | Checkpoint frequency, WAL y réplica lag. |
| 64 | **WAL nunca a ciegas** | No desactivar WAL, fsync o synchronous_commit sin evaluar pérdida de datos y contratos de durabilidad. | Prueba de crash/recovery y RPO. |
| 65 | **Réplicas de lectura** | Offload de reportes cuando la consistencia eventual es aceptable. | Lag y consistencia percibida. |
| 66 | **Rate-limit trabajos** | Controlar QPS e I/O en ETL, backups y recomputaciones para preservar el OLTP. | p95 online durante backfill. |
| 67 | **Capacidad en disco** | Reservar espacio para WAL, índices concurrentes, snapshots, vacuum y réplicas. | Alertas anticipadas de crecimiento. |

### 08 · Observabilidad y diagnóstico

| # | Práctica | Qué hacer / cuándo | Evidencia mínima |
|---:|---|---|---|
| 68 | **pg_stat_statements** | Identificar queries costosas por tiempo total, llamadas y variabilidad. | Top por total_exec_time y mean_exec_time. |
| 69 | **Slow queries** | Log con umbral adaptado, sin guardar secretos/PII en binds. | Alertas y correlación por request/job. |
| 70 | **Wait events** | Separar CPU de waits I/O/locks para actuar en causa correcta. | pg_stat_activity.wait_event_type. |
| 71 | **IO y cache** | Ver shared_blks_read/hit y datos reales, no solo porcentaje de cache hit. | EXPLAIN BUFFERS y métricas de disco. |
| 72 | **Plan regresión** | Comparar EXPLAIN antes/después de migraciones y cambios de datos. | Diff de planes críticos. |
| 73 | **Métricas de bulk** | Medir filas/s, bytes, retries, duplicados, lotes fallidos y p95. | Dashboard por import_job y tenant. |
| 74 | **SLO de DB** | Definir latencia, disponibilidad, error rate y saturación, no una única cifra. | Alertas sobre ventanas y presupuestos de error. |
| 75 | **Alertas autovacuum y lag** | Vigilar acumulación de dead tuples, edad XID, WAL y réplica lag. | Runbook con umbrales ajustados. |

### 09 · Operación, migraciones y seguridad

| # | Práctica | Qué hacer / cuándo | Evidencia mínima |
|---:|---|---|---|
| 76 | **Backfill sin downtime** | Migrar expand/contract, rellenar por lotes, cambiar lectores, retirar campo al final. | Contratos viejos/nuevos y rollback. |
| 77 | **Constraints graduales** | Usar NOT VALID/VALIDATE CONSTRAINT cuando la variante esté soportada y lo exija el tamaño. | Validación completa sin ventana larga. |
| 78 | **Backup verificado** | Ejecutar restore periódico y pruebas de integridad; backup no probado no es plan DR. | RTO/RPO medido. |
| 79 | **SQL parametrizado** | Prepared statements/bindings; nunca interpolar entradas en SQL. | Tests de inyección y lint. |
| 80 | **Menor privilegio** | Roles separados para app, lectura, migraciones, administración. | Revisión de grants y consultas prohibidas. |
| 81 | **RLS no sustituye filtros** | Para multitenancy exigir RLS correctamente configurado y políticas por user/doc cuando aplique. | Tests cruzados bajo rol real de app. |
| 82 | **Separar OLTP/reportes** | Usar read models, materialized views o warehouse si el coste de analítica afecta transacciones. | Monitorizar p95 del OLTP antes/después. |
| 83 | **Cache coherente** | Cache-aside con invalidación/versionado y métricas; no esconder queries malas con TTL gigante. | Read-after-write, hit ratio y stale rate. |
| 84 | **No borrar sin trazabilidad** | DELETE masivo sujeto a retención, auditoría y rollback/backup; considerar archivado/partición. | Reconciliar conteos y evidencia. |
| 85 | **Mantener compatibilidad** | Los esquemas de BD y contratos públicos deben evolucionar sin romper workers desactualizados. | Prueba con versión anterior de consumidor. |

## Ejemplos avanzados y excepciones

### Índice compuesto por tenant y orden

```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS products_tenant_created_idx
ON products (tenant_id, created_at DESC, id DESC);
```
Validar la selectividad real; los índices aceleran ciertas lecturas y encarecen escritura, espacio y WAL. `CREATE INDEX CONCURRENTLY` no se ejecuta dentro de un bloque de transacción.

### Cursor estable y autorización

```sql
SELECT id, nro_poliza, created_at
FROM products
WHERE tenant_id = $1
  AND (created_at, id) < ($2, $3)
ORDER BY created_at DESC, id DESC
LIMIT $4;
```
El cursor de ejemplo requiere valores de tipos compatibles, orden estable y política de acceso por usuario/documento adicional cuando el negocio la requiere.

### Operación de mantenimiento

```sql
ANALYZE products;
-- Ejecutar fuera de transacción, solo con permisos y criterio operacional:
VACUUM (ANALYZE) products;
```
`VACUUM` rutinario no equivale a `VACUUM FULL`. No usar `VACUUM FULL` sin plan de locks, ventana y espacio libre.

## Gate de aceptación por carga y consulta

- ✅ **Correcto:** correr baseline vs candidato sobre volumen representativo; anotar filas/s, p50/p95, CPU, RSS, WAL, bloqueos, errores, duplicados, réplica lag y costo.
- ✅ **Correcto:** verificar constraints, tenant, autorización, consistencia, reintentos, restart/restore y cardinalidad.
- ❌ **Incorrecto:** declarar PASS porque una consulta “pareció rápida” en una tabla vacía; aumentar pools, work_mem y workers simultáneamente sin controlar RAM.
- ❌ **Incorrecto:** optimizar lecturas rompiendo atomicidad, permisos, backups o replicación.

## Fuentes de referencia oficial

- [PostgreSQL 18 — carga masiva/COPY](https://www.postgresql.org/docs/18/populate.html)
- [PostgreSQL 18 — EXPLAIN](https://www.postgresql.org/docs/18/sql-explain.html)
- [PostgreSQL 18 — índices multicolumna](https://www.postgresql.org/docs/18/indexes-multicolumn.html)
- [PostgreSQL 18 — índices parciales](https://www.postgresql.org/docs/18/indexes-partial.html)
- [PostgreSQL 18 — autovacuum](https://www.postgresql.org/docs/18/routine-vacuuming.html)
- [PostgreSQL 18 — WAL](https://www.postgresql.org/docs/18/wal-configuration.html)


## Integración con DDD, DRY y SOLID

[24 prácticas arquitectónicas y verificables de SQL/caché](../engineering/solid-data-access.md) complementan las 85 prácticas del motor: no introducir dependencias de ORM en Domain, no serializar filas completas, usar repository ports para aislamiento, evaluar outbox para escrituras y preservar p95 online durante ETL.

✅ Medir con casos representativos, constraints y tests de autorización. ❌ Copiar el mismo criterio de lotes, índices y conexiones en cada framework como norma independiente.
