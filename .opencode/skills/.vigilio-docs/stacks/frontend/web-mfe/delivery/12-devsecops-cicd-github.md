# DevSecOps, CI/CD Y Gobierno GitHub

## Principios

- CI es la autoridad verificable.
- Menor privilegio por workflow/job.
- Actions de terceros fijadas por SHA completo.
- Artefacto único, inmutable y promovido.
- OIDC para AWS.
- Evidencia y excepciones versionadas sin secretos.

## Pipeline mínimo

```text
repository policy
  -> install frozen
  -> lint + typecheck
  -> contract/OpenAPI governance
  -> skills drift
  -> unit/component + coverage
  -> build + bundle budget
  -> secret/SAST/dependency scan
  -> SBOM
  -> CDK synth/cdk-nag
  -> E2E/visual según riesgo
  -> required gate
```

Un job estable como `Required CI Gate` agrega resultados y se protege mediante ruleset. No depender de nombres variables para branch protection.

## Permisos

- `contents: read` por defecto.
- Elevar solo en el job que publica artifact, comenta PR o usa OIDC.
- `id-token: write` únicamente para autenticación federada.
- No ejecutar código no confiable de PR con secrets privilegiados.

## Seguridad

- Gitleaks o equivalente.
- SAST/Semgrep/CodeQL según disponibilidad.
- Dependency review y audit.
- Trivy u otro scanner de filesystem/IaC.
- SBOM por artifact/release.
- Workflows y acciones validados por policy ejecutable.

## Build y artifact

- Build de producción sin sourcemaps públicos no autorizados.
- Runtime config fuera del bundle.
- Manifest y checksums cuando aplique.
- Retention explícita.
- Artifact no contiene `.env`, tokens, reportes sensibles ni dependencias de desarrollo innecesarias.

## Preview

- Recursos por PR con naming/tagging.
- Datos no productivos.
- Secrets del environment de preview.
- Deploy y cleanup idempotentes.
- `noindex` y headers de seguridad.
- Costos y TTL controlados.

## Deploy

1. Descargar artifact validado.
2. Asumir role AWS mediante OIDC.
3. Desplegar infraestructura/configuración aprobada.
4. Subir assets con políticas de caché correctas.
5. Escribir runtime config.
6. Invalidar solo rutas necesarias.
7. Ejecutar smoke y validar headers.
8. Conservar referencia para rollback.

El deploy no recompila con inputs diferentes a los validados en CI.

## Branch protection y environments

Configurar externamente:

- required status check estable;
- PR review y conversación resuelta;
- bloqueo de force-push/deletion;
- staging/production protegidos;
- reviewers y prevención de self-review donde aplique;
- secrets/variables por environment.

La presencia de documentación no demuestra que estos controles estén activos; se requiere auditoría de GitHub.

## Jira y trazabilidad

- PR/ticket vinculado cuando la organización lo exige.
- Commit/release/artifact trazables.
- Cambios de alto riesgo con OpenSpec/ADR/threat model.
- Evidencia de aprobación y despliegue retenida.

## Rollback

- Artifact anterior identificable.
- Procedimiento que no requiere recompilar.
- Invalidación CloudFront acotada.
- Runtime config compatible o rollback coordinado.
- Ensayo periódico y runbook.

## Definition of Done

- Todos los gates aplicables verdes.
- Required gate protegido externamente.
- Artifact promovido, no reconstruido.
- Smoke post-deploy correcto.
- Rollback documentado y probado.
- Evidencia sin secretos conservada.

> Fuente única para **Correcto / Incorrecto: revisión 2026**: [abrir documento canónico](../../../../governance/documentation-dry-and-ownership.md).

### ✅ Correcto / ❌ Incorrecto — DevSecOps, CI/CD Y Gobierno GitHub

✅ **Correcto:** Para **DevSecOps, CI/CD Y Gobierno GitHub**, bloquear promoción si faltan pruebas reales, firma/artifact y aprobación pertinente.

❌ **Incorrecto:** En **DevSecOps, CI/CD Y Gobierno GitHub**, dar por exitoso un release porque existe YAML o usar tokens de despliegue permanentes.
