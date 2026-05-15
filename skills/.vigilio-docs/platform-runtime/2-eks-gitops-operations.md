# Operación EKS Y GitOps

## Flujo

```text
commit
  -> CI y seguridad
  -> imagen inmutable
  -> manifest GitOps
  -> Argo CD
  -> Argo Rollouts
  -> ALB
  -> análisis Prometheus
  -> promoción o rollback
```

## Ingress Y Seguridad

- Protege ALB mediante WAF.
- Termina TLS con certificados administrados.
- Restringe ingress mediante NetworkPolicy.
- Separa permisos mediante Pod Identity.
- Evita credenciales AWS dentro de Secrets Kubernetes.
- Define timeouts para HTTP, SSE y WebSocket.
- Restringe origins y tamaños de payload.

## Disponibilidad

- Define readiness, liveness y startup probes.
- Usa PDB para servicios con varias réplicas.
- Usa HPA para API y frontend.
- Usa KEDA para workers SQS.
- Define requests y limits verificables.
- Usa topology spread para producción.
- Drena WebSockets y workers antes del cierre.

## Migraciones

- Ejecuta migraciones como hook PreSync.
- Usa una identidad separada.
- Haz cambios compatibles hacia atrás.
- Despliega expansión antes de contracción.
- Bloquea rollout tras migración fallida.
- Prueba rollback sin asumir reversión de datos.

## Rollouts

- Usa imágenes por digest o tag inmutable.
- Ejecuta análisis con métricas de negocio y plataforma.
- Define umbrales antes del despliegue.
- Detén promoción ante errores.
- Conserva historial y evidencia.
- Revierte manifests, no edites recursos manualmente.

## Ejemplos

### ✅ Correcto: worker separado

```yaml
api:
  replicas: 3
worker:
  keda:
    queueLength: 20
```

### ❌ Incorrecto: proceso mezclado

```yaml
command: ["node", "dist/main-and-worker.js"]
```

### ✅ Correcto: identidad por proceso

```yaml
serviceAccount:
  create: true
  annotations:
    eks.amazonaws.com/role-arn: ${WORKER_ROLE_ARN}
```

### ❌ Incorrecto: credencial estática

```yaml
env:
  AWS_SECRET_ACCESS_KEY: plaintext
```

### ✅ Correcto: rollback automático

```yaml
analysis:
  successRate: 99.5
  latencyP95Ms: 500
```

### ❌ Incorrecto: promoción temporal

```yaml
promoteAfterSeconds: 30
```

## Gates

- Renderiza Helm con valores mínimos y productivos.
- Valida schemas, policies y manifests.
- Escanea imágenes y SBOM.
- Prueba migraciones contra copia representativa.
- Ejecuta smoke y análisis canary.
- Prueba rollback y recuperación.

## ✅ Correcto / ❌ Incorrecto: revisión 2026

- ✅ **Correcto:** Separar estrategia por runtime (EKS vs Lambda) y validar manifests/IaC, acceso mínimo, health checks, rollback.
- ❌ **Incorrecto:** Confundir workflows de Lambda con EKS o tratar muestras YAML como un despliegue verificado.
- **Al recibir código existente:** primero caracterizar el comportamiento, después refactorizar en pasos comprobables. [Guía canónica de modernización](../standards/engineering/refactoring-existing-code.md).
