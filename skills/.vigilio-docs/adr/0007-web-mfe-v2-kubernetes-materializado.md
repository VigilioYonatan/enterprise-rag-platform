# ADR 0007 - web-mfe-v2 materializado sobre Kubernetes

## Estado

Aceptado

## Contexto

Existen dos parejas contractuales activas e independientes. `web-mfe` consume
`@vigilioyonatan/bus-contracts` de `bus-impl`; no es una linea legacy. `web-mfe-v2` consume
`@vigilioyonatan/bus-v2-contracts` de `bus-impl-v2`. Mezclar owners o packages rompe el contrato y
los ciclos de release.

La plataforma v2 ya administra EKS/ECR mediante Terraform, manifests mediante Helm y estado
deseado mediante GitOps. Hospedar `web-mfe-v2` con un CDK/S3/CloudFront paralelo duplicaria IaC,
identidades operativas, politicas y rollback.

## Decision

| Perfil | Backend | Contrato | Frontend | Delivery |
|---|---|---|---|---|
| `current-web` | `bus-impl` | `@vigilioyonatan/bus-contracts` | `web-mfe` | Runtime vigente de esa pareja |
| `k8s-v2` | `bus-impl-v2` | `@vigilioyonatan/bus-v2-contracts` | `web-mfe-v2` | OCI/ECR + Helm/Argo Rollouts + Argo CD + EKS/Terraform |

`web-mfe-v2` se materializa como proyecto propio bajo `apps/web-mfe-v2`, conservando las practicas
de Preact/Vite, vertical slices, contracts-first, testing, accesibilidad y DevSecOps de `web-mfe`.
Su hosting productivo usa un runtime Node minimo non-root dentro de una imagen distroless. La imagen
expone health/metrics, genera runtime config publica al arrancar, aplica headers y termina
graciosamente para permitir canary rollouts.

Ownership:

- `apps/web-mfe-v2`: UI, runtime config, cliente HTTP y pruebas del consumidor.
- `apps/bus-impl-v2/packages/contracts`: DTOs/schemas browser-safe y OpenAPI owner.
- `/docker`: receta OCI y build multi-arquitectura.
- `/deploy`: chart, policies, Argo Rollout y aplicaciones GitOps.
- `/infra`: ECR/EKS/IAM/DNS/foundations, sin stacks CDK paralelos.

## Consecuencias

- Los dos pares permanecen activos sin renombrar ni migrar el par actual.
- V2 promociona digests ya escaneados/firmados; production no reconstruye desde source.
- Cambios de contrato requieren gates OpenAPI/package en ambos repositorios.
- Se agrega costo operativo de un segundo frontend, pero no un segundo plano de infraestructura.
- Uploads presignados pueden usar S3 como almacenamiento de negocio sin convertir S3 en hosting del
  frontend.

## Evidencia requerida

Typecheck, lint, unit/component, coverage, E2E/visual, contrato/OpenAPI, runtime tests, bundle budget,
build OCI, Helm/policy validation, Terraform validation y smoke post-Argo CD. Un gate no ejecutado
se reporta como no verificado.

## Fecha

2026-08-09
