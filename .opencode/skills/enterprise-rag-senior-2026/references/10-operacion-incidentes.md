# 10 — Operaciones, Incidentes y Recuperación

## Manejo de Fallos e Incidentes
- **Dead-Letter Queue (DLQ)**: Ingestas fallidas o envenenadas se registran en `dlq_jobs` y se pueden inspeccionar o reintentar desde la UI o API.
- **FinOps & Presupuesto**: Bloqueo automático con código `BUDGET_EXHAUSTED` cuando se supera el límite diario en dólares.
- **Respaldos y PITR**: Procedimientos de copia lógica cifrada (`scripts/backup-encrypted.sh`) y recuperación puntual mediante pgBackRest (`scripts/pitr-pgbackrest.sh`).
