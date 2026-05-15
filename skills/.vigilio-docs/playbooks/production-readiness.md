# Playbook: revisión production readiness

Revisar en orden: riesgos (threat model), secretos/roles, schemas y backups, contrato API, healthchecks, tracing/logging sin PII, caché/colas, budgets, rate limits, despliegue canary y rollback. Todo componente debe tener owner, runbook y SLO o un `N/A` justificado.

- PHP: versión de seguridad, extensiones, `composer.lock`, Pint/Larastan/Pest, PHP-FPM/proxy HTTP/queue workers.
- Node: baseline Node/NestJS aprobado, Zod/contracts, Drizzle/PostgreSQL, runtime EKS o Lambda seleccionado explícitamente.
- Kubernetes: digest firmado, PSA/NetworkPolicy, request/limits, health probes, PDB, autoscaling y secret management.
- Contratos y eventos: pruebas con cliente, migraciones expand-contract y reintentos/outbox idempotentes.

Marcar gate `BLOCKED` cuando falta entorno, dependencias, prueba de rollback o release versionada. Nunca generar un reporte que afirme despliegue exitoso sólo por leer documentos.

> Fuente única para **Correcto / Incorrecto: revisión 2026**: [abrir documento canónico](../governance/documentation-dry-and-ownership.md).


## Gate de salida a producción

- Seguridad: AuthN/AuthZ/tenant, secrets, SBOM/audit, políticas y dependencia de terceros.
- Datos: índices, constraints, migraciones, backup/restore, aislamiento y plan rollback.
- Operación: SLI/SLO, dashboards, alertas accionables, probes, escalado, límites, logs/traces redactados.
- Calidad: contrato OpenAPI, test de integración real, pruebas de concurrencia/caché/jobs, performance representativa.
- Entrega: lockfile, versión runtime, checksum imagen, canary y aprobación según impacto.

✅ Documento con evidencia del entorno y pruebas ejecutadas. ❌ Declarar 10/10 por pasar `php -l` y enlaces Markdown; esos son checks iniciales, no certificación de producción.

> Fuente única para **Cobertura de implementación y evidencia (ampliación)**: [abrir documento canónico](../governance/complete-work-coverage-policy.md).

