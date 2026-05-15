# Laravel en producción: PHP-FPM, workers, Kubernetes/EKS, GitOps

Runtime PHP y versión Laravel aprobados en [technology/versions.md](../../../../technology/versions.md). Imagen base fijada por digest, extensiones verificadas, Composer lock, PHP-FPM con configuración de memoria y timeouts, Nginx/Ingress compatible con el despliegue. Workers `queue:work` en Deployment separado, `--max-time`/graceful termination, colas/DLQ y autoscaling por profundidad cuando corresponda.

- Liveness no debe depender de DB externa; readiness sí puede comprobar dependencias mínimas con timeouts definidos.
- `APP_KEY` y secretos desde secret manager, no repositorio. `config:cache`/route cache dentro de release inmutable si la app lo soporta; no cachear config antes de inyectar variables necesarias.
- Migrations backward-compatible `expand-contract`, nunca ejecutar automáticamente migraciones destructivas en múltiples réplicas.
- Manifiestos Kubernetes, Helm y ArgoCD pertenecen a implementación compartida de plataforma, no se duplican para cada framework.
- GitOps canary, rollback, observabilidad, resources/limits, PodDisruptionBudget, network policy, service accounts de menor privilegio.

[Manual K8s](../../../../platform/kubernetes/deployment-security.md) · [Pipeline CI/CD](../../../../platform/cicd/github-actions-gitops.md) · [Operación EKS existente](../../../../platform-runtime/2-eks-gitops-operations.md).

## ✅ Correcto / ❌ Incorrecto: revisión 2026

- ✅ **Correcto:** Separar estrategia por runtime (EKS vs Lambda) y validar manifests/IaC, acceso mínimo, health checks, rollback.
- ❌ **Incorrecto:** Confundir workflows de Lambda con EKS o tratar muestras YAML como un despliegue verificado.
- **Al recibir código existente:** primero caracterizar el comportamiento, después refactorizar en pasos comprobables. [Guía canónica de modernización](../../../../standards/engineering/refactoring-existing-code.md).

## Checklist deployment PHP-FPM/Kubernetes

- Imagen reproducible: PHP y extensiones aprobadas, Composer lock, dependencias runtime sin dev, usuario no root, filesystem de solo lectura cuando sea viable.
- Health probes separadas (alive/readiness), recursos CPU/mem, OPcache, workers/queues como deployments separados, signals/graceful shutdown y límites de concurrencia DB.
- Migraciones forward compatibles (expand/contract) antes de destruir columnas; deployment canary y rollback con versionamiento de esquemas.
- Variables de entorno y secretos desde mecanismos aprobados; logs stdout estructurados, OTel Collector y métricas de latencia/errores.

✅ Verificar `php -v`, extensiones y `composer check-platform-reqs` dentro de la imagen. ❌ Construir en PHP 8.4 y declarar que se verificó runtime PHP 8.5 sin contenedor/CI correspondientes.

## Runtime Laravel en producción

- PHP-FPM frente a runtimes persistentes: no asumir limpieza de memoria por request si se usa Octane; revisar estado mutable y providers singleton.
- Contenedores como usuario no root, imagen por digest, composer install con `--no-dev` para runtime, opcache según carga y extensiones comprobadas.
- Secrets mediante workload identity / secret manager; separar claves de cifrado por entorno. Nunca generar `APP_KEY` durante cada boot de pod.
- Health endpoints que separen liveness (proceso) de readiness (dependencias necesarias); shutdown con `terminationGracePeriodSeconds`, drenaje y reintentos de jobs.
- Migraciones backward-compatible (expand/migrate/contract) con control de rollout; rollback de imagen no revierte automáticamente DB.

✅ `php artisan config:cache` tras configurar environment, readiness y rollback con evidencia; ❌ permisos 777, `APP_DEBUG=true`, publicación de `.env` o workers que pierden jobs al terminar.

**Gate:** smoke REST + autenticación + Postgres + Redis, workers, OpenAPI, error rate y latencia p95; verificar contenedores y variables reales antes de aprobar.

## Cobertura de implementación y evidencia (ampliación)

Estas comprobaciones concretan el tema de esta guía; aplicar solo las pertinentes al sistema consumidor y documentar exclusiones justificadas.

1. **Build:** Crear artefacto inmutable con lockfile y validación reproducible.
2. **Entorno:** Separar secretos y config por release sin exponerlos en logs.
3. **Migraciones:** Aplicar expand/contract compatible con release anterior durante rollout.
4. **Readiness:** Verificar salud y capacidad de DB/caché/colas antes de traficar.
5. **Rollback:** Probar plan que preserva datos transaccionales existentes.
6. **Operación:** Correlacionar métricas y errors por release; medir p95 y rollback threshold.

✅ **Correcto:** conservar el flujo funcional y demostrar criterios de aceptación con tests, trazas, revisión de contratos o un plan reproducible según el riesgo.

❌ **Incorrecto:** sustituir las reglas de negocio por un resumen, copiar implementaciones de otro framework, declarar cobertura sin evidencia o presentar `NOT_RUN` como `PASS`.

**Salida mínima:** responsable del control, riesgo cubierto, evidencia verificable y estado `PASS | FAIL | NOT_RUN | BLOCKED`. Los comandos de ejemplo son ilustrativos salvo que se adjunte ejecución real.
