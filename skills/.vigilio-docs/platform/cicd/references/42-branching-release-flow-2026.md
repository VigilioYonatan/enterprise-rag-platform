# Trunk-Based + Environments Protegidos 2026

`bus-impl` usa trunk-based development: una sola rama principal (`main`), ramas de trabajo cortas, CI fuerte en Pull Request y despliegues controlados por GitHub Environments.

No se usa Git Flow clasico. No hay `develop` ni `release/**` como ramas permanentes oficiales.

## Flujo oficial

```text
feat/ABC-123/crear-product
  -> PR hacia main
  -> CI completo: governance, lint, typecheck, unit, integration, BDD, OpenAPI, E2E, security
  -> squash/rebase merge a main
  -> deploy automatico a staging
  -> QA prueba api-staging con Postman/Scalar/smoke
  -> si falla: nuevo PR fix hacia main
  -> si QA aprueba: workflow manual deploy-production
  -> approval GitHub Environment production
  -> smoke post-deploy + evidencia + rollback target
```

## Regla principal

- `main` siempre debe estar estable y ser candidato a release.
- Merge a `main` no significa deploy automatico a production.
- QA no prueba ramas de developers ni URLs efimeras por PR.
- QA prueba una version integrada en `staging`.
- Production solo se ejecuta manualmente desde `main` con GitHub Environment approval.

## Ramas permitidas

| Rama | Uso | Deploy |
| --- | --- | --- |
| `feat/ABC-123/descripcion` | Feature corta | No despliega ambiente compartido |
| `fix/ABC-123/descripcion` | Bugfix normal | No despliega ambiente compartido |
| `hotfix/ABC-123/descripcion` | Correccion urgente | PR directo a `main` |
| `refactor/ABC-123/descripcion` | Refactor seguro | No despliega ambiente compartido |
| `docs/ABC-123/descripcion` | Documentacion | No despliega ambiente compartido |
| `ci/ABC-123/descripcion` | CI/CD | No despliega ambiente compartido |
| `main` | Trunk estable | `staging` automatico; production manual |

Ramas no oficiales:

- `develop`: no se usa como rama viva.
- `release/**`: no se usa para QA ni production.
- `master`: no se usa.

## Ambientes protegidos

| Environment | Trigger | Approval | Uso |
| --- | --- | --- | --- |
| `development` | manual desde `main` | opcional | prueba cloud barata si se necesita |
| `staging` | automatico desde `main` o manual | 1 reviewer recomendado | QA oficial antes de production |
| `production` | manual desde `main` | 2 reviewers, no self-review, no bypass | trafico real |

## QA

QA usa una URL estable, por ejemplo:

```text
https://api-staging.empresa.com
```

Proceso:

1. El PR pasa CI y se mergea a `main`.
2. `deploy-staging.yml` despliega automaticamente a `staging`.
3. Smoke post-deploy valida `/docs-json`, health y endpoints criticos.
4. QA prueba en `staging` con Postman/Scalar.
5. Si encuentra bug, se abre otro PR corto hacia `main`.
6. Si aprueba, un responsable ejecuta `deploy-production.yml` manualmente.

Esto evita 50 servidores por rama y mantiene production protegida.

## GitHub Branch Protection

Configurar `main`:

- Require a pull request before merging.
- Require approvals: minimo 1, ideal 2 si cambia auth, CI/CD, DB, AWS o contratos.
- Require review from Code Owners.
- Require status checks to pass.
- Require conversation resolution.
- Require linear history si el equipo usa squash/rebase.
- Block force push.
- Block delete.
- Automatically delete head branches.

Status checks minimos:

- `Governance`
- `Quality`
- `Integration`
- `Integration AWS Local`
- `BDD`
- `OpenAPI Contract`
- `Playwright API E2E`
- `Infrastructure CDK`
- `Build Artifact`
- `Secret Scan`
- `Deep Security`

## GitHub Environment Protection

Configurar en GitHub:

```text
Settings -> Environments -> staging
Settings -> Environments -> production
```

Para `production`:

- Required reviewers: minimo 2.
- Prevent self-review.
- No bypass para usuarios normales.
- Deployment branches: solo `main`.
- Secrets propios de production.
- `AWS_ROLE_ARN` separado del resto de stages.

Para `staging`:

- Required reviewer opcional o 1 reviewer si QA necesita control de ventana.
- Deployment branches: solo `main`.
- `APP_BASE_URL` de staging para smoke.

## Ventajas

- Menos merge hell que Git Flow.
- CI/CD mas simple.
- Menos costo AWS porque no hay preview environment por rama.
- QA prueba una version integrada y real.
- Production queda protegida por approvals.
- Facilita rollback: se revierte o redeploya desde `main`.
- Mejor trazabilidad con Jira, PR, commit SHA, SBOM y evidencias.

## Desventajas y controles

| Riesgo | Control |
| --- | --- |
| `main` puede romperse si el CI es debil | CI fuerte obligatorio antes de merge |
| Features incompletas no deben exponerse | feature flags, endpoints protegidos o PRs pequenos |
| QA puede recibir varios cambios juntos | PRs pequenos y changelog claro |
| Staging puede bloquearse si entra bug | hotfix corto hacia `main`, redeploy automatico |
| Production manual puede demorar | approvals claros y runbook de release |

## Regla senior

Trunk-based no significa "sin control". Significa menos ramas largas y mas calidad automatizada. El control se mueve a:

- PRs pequenos.
- CI/CD fuerte.
- GitHub Environments.
- approvals.
- smoke tests.
- observabilidad.
- rollback.

> Fuente única para **Correcto / Incorrecto: revisión 2026**: [abrir documento canónico](../../../governance/documentation-dry-and-ownership.md).

### ✅ Correcto / ❌ Incorrecto — Trunk-Based + Environments Protegidos 2026

✅ **Correcto:** Para **Trunk-Based + Environments Protegidos 2026**, bloquear promoción si faltan pruebas reales, firma/artifact y aprobación pertinente.

❌ **Incorrecto:** En **Trunk-Based + Environments Protegidos 2026**, dar por exitoso un release porque existe YAML o usar tokens de despliegue permanentes.
