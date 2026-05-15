# Plataforma CI/CD: gobierno común y rutas por stack

Este directorio define **gates transversales de release**, protección de repositorio, artefactos, OIDC y GitOps. No es propietario de los comandos PHP o NestJS: cada stack documenta sus verificaciones.

| Tema | Documento propietario |
| --- | --- |
| Secuencia PR → build → staging → release | [GitHub Actions stages](github-actions-stages.md) |
| GitOps, OIDC y promoción | [GitHub Actions + GitOps](github-actions-gitops.md) |
| Aprobaciones, trazabilidad y rollback | [Release governance](release-governance.md) |
| Laravel/PHP (Composer, Pint, Larastan, Pest, PostgreSQL) | [Laravel CI](../../stacks/backend/laravel/quality/ci-quality.md) |
| NestJS/Node (pnpm, typecheck, tests, OTel) | [Guía de calidad NestJS](../../stacks/backend/nestjs/quality/refactoring-workflow.md) |
| AWS operación específica | [AWS](../aws/finops.md) |
| Seguridad de cadena de suministro | [Supply chain](../../standards/devsecops/supply-chain.md) |

## ✅ Correcto / ❌ Incorrecto

✅ **Correcto:** un job común define condiciones de aceptación, y el stack dueño aporta los comandos de su entorno con un link Markdown portable.

❌ **Incorrecto:** copiar un pipeline NestJS para Laravel cambiando únicamente el nombre, o mezclar tutoriales de PHP, AWS y React en este índice.

**Evidencia:** checks reales y artefactos verificables; la documentación no prueba un deployment ejecutado.

## Dependencias versionadas del stack

No duplicar aquí APIs externas; cuando se use una librería, abrir su documentación canónica:

- [github-actions](../../technology/libraries/github-actions.md)
- [docker-buildx](../../technology/libraries/docker-buildx.md)
- [terraform](../../technology/libraries/terraform.md)
- [kubernetes](../../technology/libraries/kubernetes.md)

✅ Correcto: comprobar compatibilidad real con runtime y lockfile. ❌ Incorrecto: copiar snippets legacy de un framework distinto.
