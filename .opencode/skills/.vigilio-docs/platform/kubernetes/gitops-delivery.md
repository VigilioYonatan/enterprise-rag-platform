# Entrega Continua Con GitOps Y ArgoCD

Establece las especificaciones de arquitectura declarativa, fronteras de confianza sin credenciales de clúster en CI, sincronización diferenciada por entorno, Review Apps efímeras y entrega progresiva para Kubernetes mediante GitOps y Argo CD ([Niveles 2 y 3 de las Arquitecturas de Referencia](../architecture/reference-topologies.md)).

## Principio Rector: CI Construye; GitOps Despliega

Ningún runner de aplicación recibe `kubeconfig`, tokens de `cluster-admin` ni ejecuta `kubectl` contra `development`, `staging` o `production`:

```text
commit en app -> CI (tests + SAST + Trivy + Syft SBOM + firma Cosign OIDC)
              -> publica imagen OCI inmutable (@sha256:...)
              -> abre PR/MR de promoción en repositorio GitOps (solo cambia el digest)
              -> aprobación CODEOWNERS -> reconciliación pull-based por Argo CD
              -> admisión Kyverno CEL -> PreSync migración única -> Argo Rollouts canary + análisis SLO
```

## Arquitectura Del Repositorio GitOps

El repositorio de despliegues estructura los manifiestos separando los servicios de plataforma compartidos de las aplicaciones de negocio. La misma convención puede aplicarse bajo namespaces de organización como `vigilio-services/deploy`, `rimac-secures/deploy` o `win/deploy`:

```text
deploy/
├── charts/                     # Charts internos de Helm versionados (API, web, worker, outbox, PreSync migrate)
├── clusters/                   # Puntos de entrada Kustomize por clúster registrado
├── platform/                   # Componentes base del clúster
│   ├── gateway/                # Gateway API + Cilium (reemplaza al retirado ingress-nginx comunitario)
│   ├── observability/          # OTel Collector, Prometheus, Loki, Tempo, Alertmanager, Grafana, OpenCost
│   ├── security/               # Kyverno CEL, Tetragon eBPF, External Secrets, cert-manager
│   └── data/                   # CloudNativePG (WAL separado + Barman PITR), NATS, Valkey, RustFS
├── policies/                   # ValidatingPolicy e ImageValidatingPolicy (Kyverno CEL) + Conftest
├── environments/               # Valores y digests sha256 por ambiente (preview, development, staging, production)
└── gitops/
    └── apps/                   # AppProjects restringidos, ApplicationSets y App-of-Apps
```

## Políticas De Sincronización Asimétrica Y Protección De Datos

1. **Separación Real de Clústeres y Datos:**
   - `development`, `staging` y `production` son clústeres registrados de forma independiente en Argo CD (no simples namespaces compartiendo un mismo servidor PostgreSQL).
   - El flujo de datos es estrictamente unidireccional: datos sintéticos e idempotentes se permiten en `development` y `staging`; las plantillas y políticas Conftest **prohíben renderizar jobs de seed en `preview` y `production`**, y jamás se copian datos crudos de producción hacia entornos inferiores.
2. **Autocuración en Entornos Inferiores Vs. Control Humano y `Prune=false` en Producción:**
   - En `development` y `staging` se activan `syncPolicy.automated.selfHeal: true` y `prune: true` para revertir alteraciones manuales y eliminar recursos obsoletos.
   - En `production`, los servicios críticos y de estado exigen PR/MR aprobado por `CODEOWNERS`, ventana de cambio y sincronización controlada. **Los recursos stateful (`CloudNativePG`, `ObjectStore`, PVCs críticos) declaran obligatoriamente `Prune=false`** para impedir que un cambio accidental en Git elimine bases de datos o respaldos.
3. **Promoción Encadenada de Digests (`development -> staging -> production`):**
   - Integrar en `main` de una aplicación propone automáticamente la actualización del digest `sha256` en `development`.
   - La promoción a `staging` copia exactamente los digests validados en `development`, y la promoción a `production` valida en CI que el digest propuesto coincida bit a bit con el aprobado en `staging`.
4. **Sync Waves y Migraciones One-Shot (`PreSync`):**
   - Las migraciones de esquema corren **una sola vez como Job con hook `argocd.argoproj.io/hook: PreSync`**, jamás dentro del arranque de cada réplica de la API.
   - Se emplean anotaciones `argocd.argoproj.io/sync-wave` para ordenar dependencias:
     - **Wave 1:** Namespaces, CRDs y `ExternalSecret` / `ClusterSecretStore`.
     - **Wave 2:** Almacenamiento, clústeres `CloudNativePG` (`Prune=false`), Valkey y NATS.
     - **Wave 3:** Job `PreSync` de migración seguido de Deployments de aplicación, workers y `Service`.
     - **Wave 4:** Rutas `Gateway API`, `CiliumNetworkPolicy` y `Rollout` progresivo.

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: payment-service-staging
  namespace: argocd
spec:
  project: workloads
  source:
    repoURL: 'https://github.com/Vigilio-Services/platform-gitops.git'
    targetRevision: main
    path: environments/staging/payment
  destination:
    name: staging-cluster
    namespace: payment
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
      - ApplyOutOfSyncOnly=true
```

## Modelo De Confianza Para Review Apps Efímeras (`deploy-preview`)

Los Pull/Merge Requests pueden levantar entornos efímeros aislados mediante `ApplicationSet` (Pull Request generator) sin entregar credenciales del clúster al runner de CI:

- **Frontera anti-abuso:** Los PR/MR provenientes de forks ejecutan tests estáticos pero **no** reciben secretos ni publican imágenes. Solo un MR interno etiquetado explícitamente con `deploy-preview` por un maintainer activa la compilación y el preview.
- **Admisión fail-closed:** Aunque Argo CD detecte la etiqueta antes de finalizar el pipeline, Kyverno verifica la firma Cosign OIDC y rechaza cualquier Pod hasta que la imagen del commit SHA esté firmada y atestada; los servicios hermanos no modificados en el MR reutilizan el **último digest aprobado de `staging`**.
- **Aislamiento multi-recurso por MR:** Cada preview se confina en un `AppProject` namespaced (sin acceso a `Secret` globales, RBAC de clúster ni CRDs) con `ResourceQuota`, `LimitRange`, Pod Security `restricted`, `NetworkPolicy` default-deny y **aislamiento total de datos**: base PostgreSQL dedicada con rol `NOSUPERUSER` (`REVOKE CONNECT` sobre bases compartidas), prefijo Valkey propio, stream/consumer NATS aislado y bucket S3 efímero.
- **Purga determinista:** Al cerrar/mergear el MR, retirar la etiqueta `deploy-preview` o superar el job diario de expiración por TTL, Argo CD destruye la `Application`, el namespace y los recursos asociados.

## Entrega Progresiva Con Argo Rollouts

Las aplicaciones críticas implementan liberaciones tipo Canary mediante Argo Rollouts:
- **Exposición Gradual de Tráfico:** Progresión por pasos ponderados (e.g. `10% -> 25% -> 50% -> 100%`) sobre **Gateway API** con ventanas de pausa para evaluar telemetría real.
- **Validación Métrica Automatizada:** Uso de `AnalysisTemplate` consultando métricas sin PII en Prometheus/OTel (tasa de errores HTTP 5xx `< 0.1%`, latencia `p99 < 200ms`).
- **Rollback Inmediato y Automatizado:** Si las métricas violan el SLO, el Rollout aborta de forma instantánea y restablece el 100% del tráfico al digest estable previo.

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Rollout
metadata:
  name: payment-service-rollout
  namespace: production
spec:
  replicas: 10
  strategy:
    canary:
      analysis:
        templates:
          - templateName: success-rate-analysis
        args:
          - name: service-name
            value: payment-service
      steps:
        - setWeight: 10
        - pause: { duration: 60s }
        - setWeight: 25
        - pause: { duration: 120s }
        - setWeight: 50
        - pause: { duration: 180s }
        - setWeight: 100
```

## Demostración Operativa y Estado Fail-Closed

Toda validación de entrega GitOps debe respaldarse con evidencia verificable en `reports/gitops-sync-evidence.json`:
- Conectividad activa y salud de la API del controlador Argo CD (`argocdApiHealthy: true`).
- Accesibilidad confirmada del clúster Kubernetes de destino (`targetClusterReachable: true`).
- Ausencia de derivas declarativas entre el repositorio y el clúster (`driftDetected: false`).
- Ausencia de parches manuales fuera del flujo GitOps (`manualInterventionDetected: false`).
- **Fail-Closed:** Si la API de Argo CD o el clúster de destino son inaccesibles, el pipeline emite estrictamente `NOT_RUN` y bloquea la certificación de despliegue.

## Matriz De Decisiones GitOps

| Dimensión | Opción Recomendada | Alternativa Restringida | Razón Técnica y Riesgo |
|---|---|---|---|
| **Actor de Despliegue** | Argo CD pull-based (cero `kubeconfig` en CI) | `kubectl apply` desde el runner de CI | Entregar credenciales de clúster a CI convierte un compromiso del pipeline en control total de producción. |
| **Sincronización y Estado** | Auto-sync en `dev`/`staging`; ventana aprobada y `Prune=false` en DBs de `prod` | `prune: true` indiscriminado sobre bases de datos productivas | Un cambio erróneo en Git podría destruir clústeres `CloudNativePG` o buckets de almacenamiento. |
| **Migraciones** | Job único en hook `PreSync` (expand-contract) | Migrar al iniciar cada réplica de la API | Provoca condiciones de carrera de locks DDL y bloquea rollbacks limpios de réplicas. |
| **Canary Rollouts** | Progresión ponderada con `AnalysisTemplate` sobre Gateway API | Despliegue directo 100% sin métricas | Expone al 100% del tráfico a regresiones de latencia o errores funcionales. |

## ✅ Correcto / ❌ Incorrecto

- ✅ **Correcto:** Promover únicamente digests `sha256` firmados mediante PR/MR encadenados (`development -> staging -> production`), ejecutando migraciones como `PreSync` y protegiendo datos productivos con `Prune=false`.
- ❌ **Incorrecto:** Entregar `kubeconfig` a los pipelines de aplicación, ejecutar `kubectl edit` manual en vivo o permitir que PRs de forks desplieguen Review Apps con acceso a secretos.
- ✅ **Correcto:** Aislar bases de datos, colas y cuotas de cada Review App (`deploy-preview`) y validar reglas de alerta con `promtool test rules` antes de activar canarios.
- ❌ **Incorrecto:** Renderizar seeds sintéticos en `preview` o `production`, o asumir éxito sin comprobar la salud y convergencia real en Argo CD.

> Fuente única para **Cobertura de implementación y evidencia (ampliación)**: [abrir documento canónico](../../governance/complete-work-coverage-policy.md).
