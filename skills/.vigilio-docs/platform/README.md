# Plataforma compartida: Compose VPS, Kubernetes GitOps, Cloud AWS, IaC, CI/CD y SRE

> **Versiones centralizadas:** consultar [technology/versions.md](../technology/versions.md). Los números que aparecen en ejemplos anteriores son históricos, no el baseline activo.

Normas de operación independientes de framework, aplicadas por perfiles específicos según escala y destino real. No mezclar PHP-FPM/Kubernetes con Node Lambda/CDK ni imponer Kubernetes a un producto simple o mediano que opera de forma óptima con Docker/Podman Compose.

## Las 3 Arquitecturas De Referencia Vigilio

- [Arquitecturas de referencia por escala (Matriz de los 3 niveles)](architecture/reference-topologies.md)
  1. **Nivel 1 — Proyectos simples a medianos (`compose-vps`):** [Entrega Cloud-Neutral con Docker y Podman Compose](compose/cloud-neutral-vps-delivery.md) (1–3 VPS, Caddy TLS, Ansible `platform-ops`, cero Kubernetes).
  2. **Nivel 2 — Empresas grandes On-Prem / Soberanía (`k8s-gitops-selfhosted`):** [Fundación Kubernetes On-Premise (RKE2 + Cilium eBPF)](onprem/kubernetes-foundation.md) + [GitOps con Argo CD y Kyverno CEL](kubernetes/gitops-delivery.md).
  3. **Nivel 3 — Empresas grandes Cloud Público (`cloud-aws-gitops`):** [Fundación de plataforma cloud en AWS](aws/platform-foundation.md) + [Opciones de runtime AWS y Azure](cloud/runtime-options.md).

## Estándares Transversales De Plataforma

- [Límites de repositorios y separación (cero carpeta `contracts/`)](architecture/repository-boundaries.md)
- [Estrategia de workspaces e higiene (`packages: []` supply-chain)](architecture/workspace-strategy.md)
- [Kubernetes seguro, Gateway API, HPA vs KEDA y Kyverno CEL](kubernetes/deployment-security.md)
- [Terraform / AWS CDK](iac/terraform-cdk.md)
- [GitHub Actions, GitOps y rollout](cicd/github-actions-gitops.md)
- [Seguridad de la cadena de suministro (SLSA v1.2 + Sigstore)](security/supply-chain.md)
- [Simulación local de producción (`prod-local` en Compose, Kind o Floci)](labs/production-local-simulation.md)
- [SRE, alertas y rollback](sre/operations.md)

Los pipelines **ejecutables** compartidos permanecen en `vigilio-platform-actions` cuando estén disponibles. Aquí se documentan diseños, evidencia y ejemplos sin simular deployments de usuario.

> Fuente única para **Correcto / Incorrecto: revisión 2026**: [abrir documento canónico](../governance/documentation-dry-and-ownership.md).


## Guías canónicas incorporadas en la migración NestJS 2026

Opciones por runtime (sin imponer framework): [AWS Lambda](aws/lambda-operations.md), [AWS FinOps](aws/finops.md), [CDK AWS](iac/cdk-aws.md), [gobierno CI/CD](cicd/release-governance.md).

✅ Correcto: enlazar el propietario único de cada decisión. ❌ Incorrecto: duplicar una norma universal en cada framework o crear carpetas `contracts/` manuales fuera de los módulos propietarios.

**Implementación propia del tema:** [Índice de CI/CD por stack](cicd/README.md).
