# Kubernetes: despliegue, seguridad, Gateway API y admisión Kyverno CEL

Toda instancia de aplicación en Kubernetes ([Nivel 2 Self-Hosted y Nivel 3 Cloud AWS/Azure](../architecture/reference-topologies.md)) utiliza `Deployment` / `Rollout`, `Service`, **Kubernetes Gateway API** (en reemplazo del retirado controlador comunitario `ingress-nginx`), `ConfigMap` no secreto, `ExternalSecret` conectado a Vault/Secrets Manager, `requests`/`limits`, `PodDisruptionBudget`, `topologySpreadConstraints`, identidad por workload y `NetworkPolicy` default-deny.

## Reglas De Escalado Y Topología De Procesos

1. **Exclusión Mutua HPA Vs. KEDA:**
   - Los servicios HTTP stateless (`api`, `web`) escalan mediante **HPA** (CPU/memoria o métricas de latencia).
   - Los consumidores asíncronos (`worker`) escalan mediante **KEDA** leyendo el backlog real del stream NATS JetStream o cola SQS.
   - **Regla estricta:** Un mismo workload jamás es gobernado simultáneamente por HPA y KEDA para evitar oscilación destructiva de réplicas (*thrashing*).
2. **Separación de Entrypoints Desde la Misma Imagen OCI:**
   - `api`, `worker`, `outbox` y el job `PreSync` de `migration` comparten exactamente el mismo digest OCI inmutable (`@sha256:...`), variando únicamente `command`, `ServiceAccount`, red permitida y sondas.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: vigilio-api
spec:
  replicas: 3
  selector:
    matchLabels: { app: vigilio-api }
  template:
    metadata:
      labels: { app: vigilio-api }
    spec:
      automountServiceAccountToken: false
      securityContext:
        runAsNonRoot: true
        seccompProfile: { type: RuntimeDefault }
      topologySpreadConstraints:
        - maxSkew: 1
          topologyKey: topology.kubernetes.io/zone
          whenUnsatisfiable: ScheduleAnyway
          labelSelector:
            matchLabels: { app: vigilio-api }
      containers:
        - name: api
          image: registry.example.invalid/vigilio-api@sha256:REPLACE_WITH_VERIFIED_DIGEST
          ports: [{ containerPort: 3100 }]
          startupProbe:
            httpGet: { path: /health/live, port: 3100 }
            failureThreshold: 30
            periodSeconds: 2
          readinessProbe:
            httpGet: { path: /health/ready, port: 3100 }
            periodSeconds: 5
          livenessProbe:
            httpGet: { path: /health/live, port: 3100 }
            periodSeconds: 10
          resources:
            requests: { cpu: 100m, memory: 256Mi }
            limits: { memory: 512Mi }
          securityContext:
            allowPrivilegeEscalation: false
            readOnlyRootFilesystem: true
            capabilities: { drop: [ALL] }
```

Manifest de referencia: la imagen es **placeholder no publicable** y las probes deben existir en la aplicación; para PHP-FPM usar frontend HTTP (Nginx/FrankenPHP si aprobado), no asumir que FPM atiende HTTP directo. Desplegar con Helm/GitOps y verificaciones Kyverno CEL/Conftest, secretos externos y volúmenes `emptyDir` en memoria para `/tmp` cuando el runtime lo requiera. [Guía EKS histórica](../../platform-runtime/2-eks-gitops-operations.md).

## Admisión Fail-Closed Con Kyverno CEL (`ValidatingPolicy` E `ImageValidatingPolicy`)

En Kyverno moderno (`1.19+`), las políticas nuevas se escriben sobre los CRDs CEL estables **`ValidatingPolicy` e `ImageValidatingPolicy`** con `validationActions: [Audit, Deny]`, evitando el `ClusterPolicy` legado próximo a retiro:

- **Inmutabilidad estricta:** Rechazo inmediato de tags mutables (`latest`, ramas) exigiendo `@sha256:...` en `production` y commit SHA completo + firma en `preview`.
- **Verificación criptográfica OIDC:** `ImageValidatingPolicy` exige firma keyless Cosign emitida por el emisor OIDC oficial del pipeline y presencia de atestaciones SBOM/provenance registradas antes de admitir cualquier Pod en namespaces etiquetados `preview` o `production`.
- **Controles de contenedor y Pod Security:** `ValidatingPolicy` junto con Kubernetes Pod Security Admission (`restricted` por labels de namespace) obligan `runAsNonRoot: true`, `readOnlyRootFilesystem: true`, `allowPrivilegeEscalation: false`, `capabilities.drop: ["ALL"]`, sondas definidas y límites de memoria.

## ✅ Correcto / ❌ Incorrecto: revisión 2026

- ✅ **Correcto:** Usar **Gateway API**, separar HPA (API/web) de KEDA (workers por backlog), aplicar `ValidatingPolicy`/`ImageValidatingPolicy` CEL en modo `Deny` y mantener AuthN + AuthZ de recurso/tenant con pruebas de acceso cruzado.
- ❌ **Incorrecto:** Introducir nuevos manifiestos `ingress-nginx` comunitarios, combinar HPA + KEDA sobre el mismo Deployment, permitir rutas públicas por comodidad o usar tags mutables en `preview`/`production`.
- **Al recibir código existente:** primero caracterizar el comportamiento, después refactorizar en pasos comprobables. [Guía canónica de modernización](../../standards/engineering/refactoring-existing-code.md).

## Plantilla de referencia de validación y operación

**No desplegar literalmente**: seleccionar `ServiceAccount` y Pod Identity/IRSA únicamente cuando el proceso consuma APIs cloud, imagen por digest real, requests calibrados por prueba de carga, endpoints de salud separados de métricas y `PodDisruptionBudget` acorde al número de réplicas.

✅ Probes distintas para startup/readiness/liveness, rollout canary con métricas sin PII y rollback por digest; ❌ root, `privileged`, `ServiceAccount` token montado sin uso, credenciales en `ConfigMap` o exponer endpoints sintéticos de prueba fuera de `local`/`development` (deben responder `404` y bloquearse con Conftest en `preview`/`staging`/`production`).

**Gates obligatorios:** `kubeconform`, Conftest/OPA sobre charts renderizados, pruebas positivas y negativas de admisión Kyverno CEL, `promtool check rules` + `promtool test rules`, image scan/SBOM/VEX, readiness, apagado grácil (`SIGTERM`) y simulacro de rollback.
