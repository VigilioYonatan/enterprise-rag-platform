# IaC compartida: Terraform/OpenTofu y AWS CDK

Terraform/OpenTofu y CDK son opciones distintas, no dependencias simultáneas obligatorias. Elegir **una fuente de verdad de cada recurso**, preservar estado remoto cifrado, locks y permisos mínimos.

- `terraform fmt -check`, `terraform validate`, plan revisado y policy-as-code antes de apply; jamás aplicar el plan sin aprobación a producción.
- Terraform providers y módulos fijados por constraints y lock file; drift detection y reconciliación documentada.
- CDK usa synthesise y diff revisados, Stack ownership, tags, roles segregados y bloqueo de cambios destructivos.
- EKS Kubernetes manifests/Helm no deben competir con Terraform por los mismos campos de recursos.
- Evitar credenciales estáticas en CI: usar OIDC y roles acotados.

Arquitectura de ejemplo para Laravel: Terraform crea EKS/VPC/RDS/Redis/IAM; Helm/GitOps administra Deployment PHP-FPM y workers, con secrets externos. **No** copiar pipelines CDK+Lambda heredados de NestJS a Laravel por defecto.

> Fuente única para **Correcto / Incorrecto: revisión 2026**: [abrir documento canónico](../../governance/documentation-dry-and-ownership.md).


## Decisiones ejecutables

- Mantener IaC aislada del dominio de negocio. Versionar providers, state backend remoto con bloqueo, acceso mínimo a secretos y plan revisado.
- Cambios de recursos críticos (DB, KMS, red, buckets): plan visible en PR, drift detection, backups y rollback documentado.
- Helm/Kubernetes viven en `platform/kubernetes`; Terraform y CDK son estrategias de IaC distintas, no obligatorias ambas.

✅ Aplicar `terraform fmt -check`, `terraform validate`, policies y plan en el workspace correcto. ❌ Aprobar plan que borra un recurso sin backups, o asumir que cambiar código fuente CDK equivale a desplegar.

## Ownership, estado y despliegue seguro

Terraform/OpenTofu y AWS CDK pueden coexistir en una organización, pero **no gestionar el mismo recurso en dos estados**. Elegir un único dueño por cuenta, región y recurso, y registrar el ADR.

```hcl
# Ejemplo Terraform ilustrativo: cifrado y tags desde módulos aprobados
terraform {
  required_version = ">= 1.10, < 2.0"
}
# Fijar provider y módulos reales en .terraform.lock.hcl del consumidor.
```

**Gate previo:** `fmt`, `validate`, escaneo IaC, lock/providers, revisión del plan y permisos mínimos. State remoto cifrado, con locking, versionado y acceso de escritura restringido. No imprimir secrets en plan ni logs.

✅ `plan` revisado antes de `apply` y destroy protegido; ❌ recrear infraestructura crítica por drift no analizado, copiar secretos en `.tfvars` versionados, ejecutar CDK + Terraform en los mismos recursos.

**Evidencia:** plan digest, responsable de aprobación, recursos creados/modificados, controles IAM y prueba de rollback/restore.

> Fuente única para **Cobertura de implementación y evidencia (ampliación)**: [abrir documento canónico](../../governance/complete-work-coverage-policy.md).

