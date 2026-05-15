# Runbook: Restauración de Base de Datos PostgreSQL

## Precondiciones
- Acceso a IAM rol `PlatformDBA`.
- PostgreSQL host y cluster target identificados.
- Snapshot o WAL archive verificado.

## Procedimiento de Ejecución
1. Verificar espacio en disco objetivo (`df -h`).
2. Detener tráfico entrante activando ventana de mantenimiento en API Gateway / Ingress.
3. Restaurar snapshot Point-In-Time (PITR) o ejecutar:
   ```bash
   pg_restore --clean --if-exists --no-owner -h $PGHOST -U $PGUSER -d $PGDATABASE snapshot.dump
   ```
4. Ejecutar migraciones Drizzle pendientes:
   ```bash
   pnpm exec drizzle-kit migrate
   ```
5. Ejecutar smoke tests de integridad de datos y relaciones foráneas.
6. Habilitar tráfico y monitorizar error rate en Datadog / Prometheus.

## Rollback
Si la restauración presenta corrupción o inconsistencia, restaurar snapshot inmediato previo al inicio de la ventana.

✅ **Correcto:** Verificar integridad y permisos antes de reabrir el tráfico de producción.
❌ **Incorrecto:** Restaurar directamente sobre una base productiva activa sin lock ni ventana de mantenimiento.
