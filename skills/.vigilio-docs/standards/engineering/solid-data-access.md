# SOLID + DRY aplicados a repositorios, SQL, caché y servicios de dominio

**Norma transversal, independiente del framework.** [DDD](../../foundations/architecture/ddd.md), [nombres](naming-and-boundaries.md), [85 prácticas SQL](../data/sql-performance.md), [pruebas](../testing/semantic-ddd-contract-gates.md). Esta guía no repite la lista SQL: define cómo combinarla con arquitectura y seguridad en un proyecto real.

## Principios de separación

- **S — Single Responsibility:** Application decide *qué* operación ejecutar; repository implementa consulta/persistencia; Domain valida invariantes; presenter proyecta JSON; operador define capacidad/retención.
- **O — Open/Closed:** filtros tipados y estrategias de consulta extensibles sin ramificar por framework o copiar repositorios; no introducir abstracción antes de la variación real.
- **L — Liskov:** una implementación en memoria y una SQL deben respetar semántica de `findById`, `save`, orden, filtros y valores ausentes; no garantizar implícitamente orden que el contrato no declara.
- **I — Interface Segregation:** separar lecturas/escrituras si sus consumidores/garantías difieren; no exponer `deleteAll`, `rawQuery` o Eloquent/Drizzle en puertos de dominio.
- **D — Dependency Inversion:** Application depende de puertos, no de Redis, de cliente HTTP, ni de driver SQL. Infrastructure traduce errores técnicos a resultados/errores de dominio cuando procede.
- **DRY:** compartir *conocimiento estable*, no esconder casos de uso distintos detrás de una abstracción enorme ni reutilizar una respuesta que expone campos incorrectos.

## 24 prácticas verificables: arquitectura + rendimiento

| # | Práctica | Cuándo aplicarla / consecuencia | Cómo verificar |
|---:|---|---|---|
| 1 | Contrato mínimo de repositorio | Separar `findById`, `findByCriteria`, `save`; evitar fachada CRUD universal | Test de port y consumidores |
| 2 | `tenant_id` obligatorio | Incluir tenant y autorización en consultas; no aceptar tenant proporcionado por cliente sin verificación | Cross-tenant negativo |
| 3 | Lectura de dominio vs read model | Usar entidad para cambios de estado; proyección mínima para listados | Test DTO y permisos |
| 4 | Sin DTO HTTP en Domain | Domain independiente de NestJS/Laravel/OpenAPI | Dependency graph |
| 5 | Modelo de columnas explícito | `SELECT` solo campos necesarios; evitar ORM serializado directamente | Inspección JSON / PII |
| 6 | Constraint respalda invariante | UNIQUE/FK/CHECK reales en DB para condiciones persistentes | Tests conflictos concurrentes |
| 7 | Paginador DRY y separado | Cursor vs offset según SLA, no tres versiones de `limit` | Unit + E2E defaults |
| 8 | Orden estable | Tie-breaker ID e índice adecuado | Inserción entre páginas |
| 9 | Evitar N+1 | Agrupar consultas/eager loading donde mejore throughput | Contador queries |
| 10 | Índice medido | No crear índices por cada `WHERE`; verificar plan + coste escrituras | EXPLAIN/BUFFERS |
| 11 | Batch insert medido | Ajustar lotes según bytes, binds, locks, p95 | Load benchmark comparado |
| 12 | COPY/Staging al importar | Para millones de filas y validaciones con reconciliación | Import retry y checksum |
| 13 | Stream de entrada | No cargar 1M objetos en RAM | Perfil de memoria |
| 14 | Claves idempotentes | Reintentos sin crear filas duplicadas | Ejecutar 2 veces el job |
| 15 | Transaction boundary explícito | No intercalar llamadas externas dentro de transacción SQL | Inyección de fallo |
| 16 | Concurrencia de agregado | Lock/política optimista ante cambios competidores | Test race |
| 17 | Outbox confiable | Commit estado + outbox, despachar después | Crash después del COMMIT |
| 18 | Cache tenant-aware | Key incluye tenant, autorización y filtros; TTL justificado | Test de cruce de permisos |
| 19 | Invalida al mutar | Generación de cache/evicción exacta, no `DEL prefix:*` | Test lectura post mutación |
| 20 | Rate-limit de imports | Proteger p95 de tráfico online ante ETL/worker | Carga mixta |
| 21 | Pool de DB acotado | Considerar réplicas/workers y límites de conexiones | pg_stat_activity |
| 22 | Observabilidad sin secretos | Métricas p95, WAL, errores y caché sin PII en labels | Audit telemetry |
| 23 | Seguridad del SQL | Parámetros bind, privilegios mínimos y RLS si procede | Injection y aislamiento |
| 24 | Migración sin indisponibilidad | Expand-contract y backfill con reanudación y rollback | Ensayo staging + deploy |

## ✅/❌ Decisiones de referencia

✅ **Correcto:** Application llama `findById(product_id, tenant_id)` y `save(product)`; Domain ejecuta `approve()`; SQL hace `UPDATE` y constraints según sus responsabilidades; los tests comprueban estado, JSON, cache e idempotencia.

❌ **Incorrecto:** trasladar `approvePolicy()` a `update()` del controller; exponer `select *` como Response DTO; SQL construido por concatenación; copiar contratos iguales por cada caso de uso; perf tuning sin medir; clasificar un smoke test como integración de PostgreSQL.

**Gate:** el responsable informa `PASS`, `FAIL`, `NOT_RUN` o `BLOCKED` para cada categoría pertinente. La presencia de esta guía **no** demuestra pruebas de producción.
