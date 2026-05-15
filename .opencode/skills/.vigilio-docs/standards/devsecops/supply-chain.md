# Supply chain y políticas CI/CD comunes

## Gates compartidos

Lockfile comprometido, vulnerabilidades con política de excepción trazable, dependencias permitidas, lint/tipos/tests, SBOM, análisis de imágenes, firma/atestación cuando se exige, y despliegue mediante identidades OIDC/workload.

✅ Correcto: pipelines con mínimos permisos, approvals por environment, artefactos inmutables y pruebas de rollback.

❌ Incorrecto: usar secreto AWS estático en Actions, `latest` en producción, saltar tests o elevar permisos de la CI por conveniencia.

## Políticas específicas

- NestJS: pnpm lock, TypeScript/Vitest y generación/diff OpenAPI.
- Laravel: composer.lock, `composer audit --locked`, Pint, PHPStan/Larastan, Pest e integración PostgreSQL.
- IaC: terraform plan validado o CDK diff según runtime elegido; nunca imponer Lambda y EKS a la vez.
- Despliegue: commit/artefacto asociado, stage protegido, métricas y rollback observable.

[CI/CD estándar](cicd.md) · [plataforma](../../platform/cicd/github-actions-stages.md).

## Procedencia documental preservada

- [Capítulo heredado: 4-devsecops.md](../../platform/cicd/references/4-devsecops.md) — contenido íntegro conservado.
- [Capítulo heredado: 41-dependabot-repository-policy.md](../../platform/cicd/references/41-dependabot-repository-policy.md) — contenido íntegro conservado.

## Mejoras técnicas verificables — 2026

**11. Supply chain y reproducibilidad.** ✅ Lockfile, auditoría, escaneo SCA, SBOM y runners con permisos mínimos; registrar proveniencia de artefactos. ❌ Instalar latest indiscriminado en producción o publicar secretos desde CI.

> Fuente única para **Cobertura de implementación y evidencia (ampliación)**: [abrir documento canónico](../../governance/complete-work-coverage-policy.md).

## Cadena de confianza y verificación

- Pin por digest los contenedores base y por SHA revisado las acciones de terceros. Mantener actualizaciones automatizadas con revisión humana y escaneo.
- Construir con lockfiles versionados. Una actualización de dependencias exige tests, análisis de vulnerabilidades y compatibilidad de contrato.
- Emitir SBOM/provenance cuando la política lo requiera; conservar digest y firma asociados al commit entregado.
- Preferir GitHub OIDC con credenciales cloud temporales a secrets estáticos. Usar permisos mínimos `contents: read` como valor por defecto.
- En producción, verificar artifact por digest y dar seguimiento a excepciones de CVE (dueño, fecha y mitigación).

✅ **Correcto:** un release liga SHA de commit, artefacto, firma, SBOM, escaneos y evidencia de smoke.

❌ **Incorrecto:** usar `latest`, deshabilitar Composer audit/`npm audit` para pasar CI, subir tokens al YAML o promover artefactos recompilados sin trazabilidad.

La implementación por runtime no se duplica aquí: [Laravel CI](../../stacks/backend/laravel/quality/ci-quality.md) y [gates generales](../../platform/cicd/github-actions-stages.md).
