# Arquitecturas de runtime: Compose VPS, Kubernetes On-Prem, AWS y Azure

Un framework puede tener más de un destino operativo. Elegirlo según escala, carga, eventos, latencia, soberanía y coste; no incrustar Kubernetes, Lambda o EKS como propiedad implícita del perfil `node-nest` o `php-laravel`. Para la taxonomía completa de los tres niveles consultar [Arquitecturas de Referencia por Escala](../architecture/reference-topologies.md).

| Capacidad | Nivel 1: VPS Compose (`compose-vps`) | Nivel 2: K8s Self-Hosted (`RKE2`) | Nivel 3: AWS EKS / Azure AKS | Serverless: AWS Lambda |
|---|---|---|---|---|
| **Runtime** | Contenedores Distroless (Docker / Rootless Podman) | Contenedores + workers sobre nodos propios | Contenedores + workers sobre nodos privados | Funciones efímeras por evento |
| **Configuración y CD** | 1 solo `compose.yaml` + Ansible (`platform-ops`) | Helm/Kustomize + Argo CD + Argo Rollouts | Terraform + Helm + Argo CD + Argo Rollouts | SAM/CDK/Terraform según ADR |
| **Red y borde** | Caddy TLS + 3 redes aisladas (`edge`/`backend`/`obs`) | Cilium eBPF (WireGuard) + MetalLB + Gateway API | CloudFront + WAF + ALB / Gateway API + VPC 3 AZs | API Gateway + VPC cuando aplique |
| **Observabilidad** | OTel + Prometheus/Loki/Tempo/Grafana co-versionados | OTel + Prometheus/Loki/Tempo/Grafana + OpenCost | OTel/ADOT + X-Ray/CloudWatch o stack Grafana | OTel/X-Ray cuando sea aplicable |
| **Secretos** | Protected Environments + `.env` `0600` fuera de OCI | Vault + External Secrets Operator | Secrets Manager / Key Vault + Pod Identity / IRSA | Secrets Manager / SSM |

Policies comunes: least privilege, network restrictions, image scanning, SBOM + firma Cosign OIDC, TLS, cifrado, FinOps, DR 3-2-1 probado, quotas y SLO. Los perfiles de skills de plataforma se añaden **opcionalmente** tras conocer el destino. No mezclar backend NestJS-Lambda con NestJS-EKS ni introducir Kubernetes en proyectos simples sin ADR explícito.

> Fuente única para **Correcto / Incorrecto: revisión 2026**: [abrir documento canónico](../../governance/documentation-dry-and-ownership.md).


## Matriz de decisión por carga y escala

| Alternativa | Elegir cuando | Evitar cuando |
|---|---|---|
| **VPS + Docker/Podman Compose** ([guía](../compose/cloud-neutral-vps-delivery.md)) | Proyectos simples a medianos (1–3 hosts), equipo compacto, presupuesto acotado y foco en velocidad operativa sin lock-in cloud | Hay `>= 5` servicios independientes, múltiples equipos con cuotas aisladas o necesidad de failover automático multi-nodo |
| **Kubernetes Self-Hosted + GitOps** ([guía](../onprem/kubernetes-foundation.md)) | Empresas grandes con datacenter propio, soberanía regulatoria, múltiples equipos y operación 24/7 capaz de sostener RKE2/Cilium/CSI | Equipo pequeño sin experiencia operando etcd, CNI eBPF, almacenamiento distribuido y upgrades de clúster |
| **AWS EKS / Azure AKS + GitOps** ([guía](../aws/platform-foundation.md)) | Operación empresarial multi-servicio en nube pública, gobernanza multicuenta, servicios de datos gestionados y GitOps maduro | La complejidad y el coste fijo del control plane + NAT/ALB exceden el beneficio del producto |
| **AWS Lambda** | Requests/eventos breves, scale-to-zero, poco estado, tolerancia a cold starts | Procesos persistentes, WebSockets largos o workers continuos sin adaptación |
| **Fargate/ECS o Container Apps** | Contenedores en nube pública con menor carga operativa que EKS/AKS | Necesitas políticas de admisión Kubernetes (Kyverno CEL), KEDA avanzado o portabilidad estricta |

✅ Elegir runtime por restricciones de SLO, tamaño de equipo, costo, arranque, red y observabilidad. ❌ Incluir Lambda/CDK, EKS/Terraform o Kubernetes obligatorio en una skill base de backend.

## Matriz de selección de runtime y riesgos a probar

| Opción | Preferir cuando | Riesgos que hay que probar |
| --- | --- | --- |
| VPS + Rootless Podman Compose | monolito modular (API + outbox + worker en 1 imagen), 1–3 nodos | dominio único de fallo en host, backup `pgBackRest` PITR externo, presupuesto de conexiones PostgreSQL |
| RKE2 + Cilium + Argo CD | soberanía de datos, clústeres propios separados (`dev`/`staging`/`prod`) | quórum etcd, discos Longhorn/Rook-Ceph x3, failover MetalLB, restore drill físico `CloudNativePG` |
| EKS + Terraform + Argo CD | servicios sostenidos en AWS, integración IAM/KMS/RDS/SQS | coste de clúster/NAT, Pod Identity/IRSA mínimo, requests/limits, PDB, análisis canary SLO |
| AWS Lambda + API Gateway | tráfico variable, ejecución corta | cold starts, VPC, conexión DB, tiempo máximo, coste por invocación |
| ECS/Fargate o Azure Container Apps | contenedor administrado sin operar control plane K8s | límites de networking/operación, identidad workload, egress, autoscaling |

**Regla:** ninguna skill de desarrollo NestJS o Laravel debe imponer Lambda, EKS o Kubernetes por el lenguaje. El perfil de deployment se elige por runtime concreto, aprobado por ADR y SLO.

✅ Dimensionar basado en métricas, coste y requisitos de tenancy; ❌ imponer `node-nest-security-aws` (Lambda) o `kubernetes-eks-delivery` a un proyecto que despliega en Docker/Podman Compose.

**Pruebas:** carga, apagado controlado, rollback por digest, secretos, telemetría y coste aproximado con configuración real antes del release.

## Cobertura de implementación y evidencia (ampliación)

Estas comprobaciones concretan el tema de esta guía; aplicar solo las pertinentes al sistema consumidor y documentar exclusiones justificadas.

1. **Criterios verificables:** Relacionar cada afirmación con implementación, excepción o evidencia reproducible.
2. **Casos límite:** Documentar al menos un error o condición de borde relevante al objetivo.
3. **Preservación:** Conservar reglas previas y añadir notas de compatibilidad solo cuando tengan valor.

✅ **Correcto:** conservar el flujo funcional y demostrar criterios de aceptación con tests, trazas, revisión de contratos o un plan reproducible según el riesgo.

❌ **Incorrecto:** sustituir las reglas de negocio por un resumen, copiar implementaciones de otro framework, declarar cobertura sin evidencia o presentar `NOT_RUN` como `PASS`.

**Salida mínima:** responsable del control, riesgo cubierto, evidencia verificable y estado `PASS | FAIL | NOT_RUN | BLOCKED`. Los comandos de ejemplo son ilustrativos salvo que se adjunte ejecución real.
