# NestJS: transacciones, migraciones y concurrencia

El caso de uso define el límite lógico de consistencia, el adapter ejecuta transacciones Drizzle de PostgreSQL. No entregar instancias Drizzle a dominio; `UnitOfWork` o callback de transacción solo cuando evite acoplamiento o gestione varias operaciones.

## Escenarios críticos

- Aprobar póliza que requiere escribir estado, auditoría y outbox: **misma transacción SQL**.
- Concurrencia: bloqueo `FOR UPDATE` u optimistic version, según throughput y negocio.
- Migración incompatible: expand-contract con compatibilidad de versiones desplegadas simultáneamente.
- Seeders: no meter datos productivos secretos; incluir fixtures idempotentes y versionados para tests.

✅ Correcto: test de rollback que demuestra que ni entidad ni outbox quedan confirmados ante error.

❌ Incorrecto: `db.transaction` alrededor de Redis o de llamadas HTTP externas como si fueran parte del commit PostgreSQL.

## Operación y seguridad

Usar transacciones breves, timeout/locks configurados, reintentos limitados con idempotencia, métricas de deadlocks y runbook para migración fallida. Antes de `DROP`, verificar lectores existente, backups y rollback.

[Data común](../../../../standards/data/migrations-and-backups.md).

## Procedencia documental preservada

- [Capítulo heredado: 15-migrations-db.md](references/15-migrations-db.md) — contenido íntegro conservado.
- [Capítulo heredado: 26-seeders-ddd.md](references/26-seeders-ddd.md) — contenido íntegro conservado.

> Fuente única para **Cobertura de implementación y evidencia (ampliación)**: [abrir documento canónico](../../../../governance/complete-work-coverage-policy.md).

