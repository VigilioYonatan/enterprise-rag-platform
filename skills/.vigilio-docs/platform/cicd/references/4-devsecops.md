# DevSecOps y Calidad - `bus-impl` 2026

Este documento adapta el baseline de `aws-arquitecture/docs/18.DevSecOps-2026.md` al backend `bus-impl`: NestJS, Zod, Drizzle, PostgreSQL, CDK, Lambda y GitHub Actions.

---

## 1. Principios 2026

- GitHub Actions como motor principal de CI/CD.
- OIDC para asumir roles AWS, sin access keys estaticas en CI.
- Biome como linter/formatter canonico. No usar ESLint ni Prettier.
- Quality gates antes de deploy: lint, typecheck, unit, integration, contract, security, IaC.
- Artefactos versionados: coverage, OpenAPI, SARIF, SBOM, CDK synth.
- SBOM CycloneDX, provenance attestation y SBOM attestation obligatorios para artefactos de build/release.
- Actionlint obligatorio para evitar workflows invalidos o inseguros.
- Seguridad por capas: SAST, SCA, secret scanning, IaC scanning, DAST y smoke post deploy.
- Preview environments por PR cuando cambien contratos API, autenticacion o flujos criticos.
- Rollback probado antes de considerar production listo.

---

## 2. Pipeline recomendado

```text
Local
  -> pre-commit: lint-staged + Biome
  -> commit-msg: [ID-TICKET] - tipo: descripcion
  -> pre-push: lint + typecheck + unit tests

Pull Request
  -> Detectar cambios para saltar jobs pesados si el PR solo toca docs
  -> Biome CI
  -> TypeScript strict
  -> Unit tests (Vitest)
  -> Integration tests (Vitest + PostgreSQL real)
  -> OpenAPI export + diff
  -> SAST/SCA/Secrets/IaC scans
  -> Preview deploy si cambia API critica
  -> Smoke + Playwright request tests

Merge to main
  -> Build
  -> CDK synth
  -> CDK diff
  -> Deploy con OIDC
  -> Smoke tests
  -> DAST temprano en development/staging
  -> Observability checks

Production
  -> approval manual
  -> deploy canary o blue/green
  -> monitor 15 minutos
  -> rollback automatico si suben 5XX, latencia P99 o errores criticos
```

---

## 3. GitHub Actions base para `bus-impl`

Este bloque es el baseline minimo. Para los stages desplegables `development`, `staging` y `production`, aplicar tambien las secciones `17`, `18` y `19` de este mismo documento. `NODE_ENV=test` pertenece a las suites, no a CDK.

Versiones de referencia usadas en este documento:

- `actions/checkout@v6`
- `actions/setup-node@v6`
- `pnpm/action-setup@v4`
- `aws-actions/configure-aws-credentials@v6`
- Node.js `24`
- pnpm `11.7.0`

Las referencias `@v*` de los snippets son etiquetas didacticas. En archivos ejecutables deben
reemplazarse por SHA completo y conservar la version solamente como comentario. Los workflows
reales de `bus-impl` ya aplican esa regla.

```yaml
name: bus-impl-devsecops

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]
  merge_group:
  workflow_dispatch:

permissions:
  contents: read
  id-token: write
  security-events: write
  pull-requests: read

env:
  NODE_VERSION: '24.16.0'
  PNPM_VERSION: '11.7.0'
  AWS_REGION: 'us-east-1'

jobs:
  quality:
    name: Quality
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
      - uses: pnpm/action-setup@v4
        with:
          version: ${{ env.PNPM_VERSION }}
      - uses: actions/setup-node@v6
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: pnpm
      - run: pnpm install --frozen-lockfile --prefer-offline
      - run: pnpm lint
      - run: pnpm typecheck
      - run: pnpm test:coverage:ci

  integration:
    name: Integration
    needs: quality
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:17-alpine
        env:
          POSTGRES_DB: ${{ vars.TEST_DATABASE_NAME }}
          POSTGRES_USER: ${{ vars.TEST_DATABASE_USER }}
          POSTGRES_PASSWORD: ${{ secrets.TEST_DATABASE_PASSWORD }}
        ports:
          - 5432:5432
        options: >-
          --health-cmd "pg_isready -U postgres"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    steps:
      - uses: actions/checkout@v6
      - uses: pnpm/action-setup@v4
        with:
          version: ${{ env.PNPM_VERSION }}
      - uses: actions/setup-node@v6
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: pnpm
      - run: pnpm install --frozen-lockfile --prefer-offline
      - run: pnpm test:integration
        env:
          E2E_AUTO_START_POSTGRES: 'false'
          E2E_DATABASE_ADMIN_URL: ${{ secrets.E2E_DATABASE_ADMIN_URL }}
          E2E_DATABASE_URL: ${{ secrets.E2E_DATABASE_URL }}

  contract:
    name: OpenAPI Contract
    needs: integration
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
      - uses: pnpm/action-setup@v4
        with:
          version: ${{ env.PNPM_VERSION }}
      - uses: actions/setup-node@v6
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: pnpm
      - run: pnpm install --frozen-lockfile --prefer-offline
      - run: pnpm openapi:export
      - run: pnpm openapi:diff
      - uses: actions/upload-artifact@v4
        with:
          name: openapi
          path: docs/openapi/

  security:
    name: Security
    needs: contract
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
      - uses: pnpm/action-setup@v4
        with:
          version: ${{ env.PNPM_VERSION }}
      - uses: actions/setup-node@v6
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: pnpm
      - run: pnpm install --frozen-lockfile --prefer-offline
      - name: Semgrep SAST
        uses: semgrep/semgrep-action@v1
        with:
          config: p/typescript
      - name: Trivy filesystem scan
        uses: aquasecurity/trivy-action@v0.36.0
        with:
          scan-type: fs
          scan-ref: .
          format: sarif
          output: trivy-fs.sarif
          severity: HIGH,CRITICAL
          exit-code: 1
      - name: Gitleaks secret scan
        uses: gitleaks/gitleaks-action@v2
      - name: Upload SARIF
        uses: github/codeql-action/upload-sarif@v4
        if: always()
        with:
          sarif_file: trivy-fs.sarif

  infrastructure:
    name: CDK and IaC
    needs: security
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
      - uses: pnpm/action-setup@v4
        with:
          version: ${{ env.PNPM_VERSION }}
      - uses: actions/setup-node@v6
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: pnpm
      - run: pnpm install --frozen-lockfile --prefer-offline
      - run: pnpm cdk:synth
      - name: Checkov IaC scan
        uses: bridgecrewio/checkov-action@v12
        with:
          directory: cdk/
          framework: cloudformation
          output_format: sarif

  deploy-development:
    name: Deploy Development
    needs: infrastructure
    if: github.event_name == 'workflow_dispatch' && github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    environment: development
    steps:
      - uses: actions/checkout@v6
      - uses: pnpm/action-setup@v4
        with:
          version: ${{ env.PNPM_VERSION }}
      - uses: actions/setup-node@v6
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: pnpm
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v6
        with:
          role-to-assume: ${{ secrets.AWS_DEV_ROLE_ARN }}
          aws-region: ${{ env.AWS_REGION }}
      - run: pnpm install --frozen-lockfile --prefer-offline
      - run: pnpm cdk:deploy:development
      - run: pnpm smoke:endpoints
      - run: pnpm test:e2e:smoke
```

---

## 4. Quality gates obligatorios

### Calidad de codigo

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test:coverage:ci`
- `pnpm test:integration`

Regla DevSecOps para PostgreSQL de pruebas:

- local puede usar autostart con Podman/Docker para mejorar DX.
- CI/CD debe usar `services.postgres` y `E2E_AUTO_START_POSTGRES=false` para fallar rapido si la base no esta disponible.
- `vigilio-node setup-e2e-db`, expuesto por `@vigilioyonatan/node-nest-tooling`, recrea la base
  `_e2e` y aplica migraciones antes de integration/e2e.

Regla de velocidad del pipeline:

- `concurrency.cancel-in-progress` cancela runs antiguos de la misma rama para no gastar minutos.
- `Detect Changes` calcula gates por rutas: typecheck, unit, integration, bdd, contract, e2e, build y deep security.
- si `docs_only=true`, se ejecutan governance, install, lint/formato y secret scan; se saltan PostgreSQL, e2e, OpenAPI, build, CodeQL y Trivy.
- si cambia `src/`, `package.json`, `pnpm-lock.yaml`, `drizzle/`, contratos o workflows, se activan validaciones fuertes segun riesgo.
- integration, bdd, contract y e2e estan separados para no bloquearse entre ellos cuando no aplican.
- `quality` corre primero como filtro barato; si falla lint/typecheck/unit, no se gastan minutos en jobs caros.
- `Playwright API E2E` no instala Chromium; usa `request` contra la API real para ahorrar minutos de CI.
- `Playwright Browser E2E` vive en un job separado e instala Chromium solo si hay pruebas `.browser.spec.ts`.
- PR ejecuta E2E smoke de API; push/merge ejecuta la suite API E2E completa.
- cada job con PostgreSQL usa base `_e2e` propia, por ejemplo `bus_impl_integration_e2e`, `bus_impl_api_e2e` y `bus_impl_browser_e2e`, para evitar carreras entre jobs paralelos.
- no usar tests por archivos tocados como unico gate de merge; `pnpm test:changed` es para feedback local rapido, no reemplaza `pnpm test:coverage`.

Controles fuertes agregados:

- `actionlint` valida sintaxis y expresiones de GitHub Actions antes de confiar en el pipeline.
- `Gitleaks` corre siempre porque un secreto puede filtrarse incluso en documentacion.
- `CodeQL` corre solo en cambios de codigo/dependencias/workflows para SAST profundo sin quemar minutos en docs-only.
- `Semgrep CLI` pinneado complementa CodeQL con reglas OWASP para patrones comunes de seguridad en PRs de codigo y nightly.
- `Trivy fs` detecta CVEs y problemas de dependencias/archivos.
- `Trivy config` detecta riesgos IaC/config en CDK, YAML, Dockerfile o manifests cuando existan.
- `SBOM CycloneDX` queda como artifact para auditoria de dependencias y trazabilidad.
- `actions/attest` firma la procedencia del artefacto para reducir riesgo supply-chain.
- `sbom-path` en `actions/attest` asocia el SBOM firmado al artefacto construido.
- `OWASP ZAP baseline` corre en nightly si existe `STAGING_BASE_URL`; no bloquea PRs locales ni docs-only.

Matriz de ejecucion del PR:

| Cambio | Gates minimos |
|---|---|
| `docs/*`, `README.md`, `*.md` | governance, lint/formato, secret scan |
| `.github/workflows/*` | governance, lint, deep security |
| `package.json`, `pnpm-lock.yaml`, `.npmrc` | governance, lint, typecheck, unit, integration, bdd, contract, e2e, build, deep security |
| `src/*` | governance, lint, typecheck, unit, integration, bdd, contract, e2e, build, deep security |
| `drizzle/*` | governance, lint, integration, e2e, build |
| `tests/unit/**` | governance, lint, typecheck, unit |
| `tests/integration/**` | governance, lint, typecheck, integration |
| `tests/bdd/**` | governance, lint, typecheck, bdd |
| `tests/e2e/**`, `playwright.config.ts` | governance, lint, e2e |
| `tests/e2e/**/*.browser.spec.ts` | governance, lint, browser e2e con Chromium |
| `scripts/export-openapi.ts`, cambios OpenAPI o `@vigilioyonatan/node-nest-tooling` | governance, lint, contract |

Reportes de pruebas:

- Vitest unit genera `reports/vitest-unit.xml` en CI.
- Vitest integration genera `reports/vitest-integration.xml` en CI.
- Cucumber genera `reports/cucumber-report.json` en CI.
- Playwright genera `reports/playwright-e2e.xml` y `playwright-report/`.
- Los reportes se suben como artifacts con retencion corta para auditoria y debugging.

Tags E2E:

- `@smoke`: flujo rapido que valida que el sistema esta vivo.
- `@critical`: flujo core de negocio/auth que no debe romperse.
- `@contract`: validacion de contrato/documentacion OpenAPI.
- PR puede ejecutar suites filtradas si se necesita mas velocidad; nightly/regression debe ejecutar todo.

### Testing

| Tipo | Herramienta | Gate |
|---|---|---|
| Unitario | Vitest | PR |
| Integracion | Vitest + PostgreSQL real | PR |
| Contrato API | OpenAPI export + diff | PR |
| Smoke HTTP | Playwright request o script HTTP | Deploy |
| E2E critico | Playwright | Preview/Staging |
| DAST | Nuclei u OWASP ZAP baseline | Development/Staging |

### Coverage recomendado

| Capa | Lines | Functions | Branches | Statements |
|---|---:|---:|---:|---:|
| `domain/` | 90 | 90 | 85 | 90 |
| `application/` | 85 | 85 | 80 | 85 |
| `infrastructure/` | 80 | 80 | 75 | 80 |
| `shared/` | 90 | 90 | 85 | 90 |

### Contrato

- Exportar `docs/openapi/openapi.json`.
- Exportar `docs/openapi/openapi.yaml`.
- Comparar breaking changes en PR.
- Bloquear merge si cambia contrato sin aprobacion.
- Publicar OpenAPI como artefacto de CI.

### Infraestructura

- `pnpm cdk:synth`
- `pnpm cdk:diff`
- Checkov o Trivy config sobre salida CloudFormation/CDK.
- Infracost si el cambio toca recursos de costo sensible.

---

## 5. Stack de herramientas DevSecOps

| Tipo | Herramienta | Uso |
|---|---|---|
| Lint/format | Biome | Canonico para TS/JS/JSON/MD/YAML |
| Typecheck | TypeScript strict | Gate obligatorio |
| Unit/integration | Vitest | Testing backend |
| E2E/smoke | Playwright | Smoke HTTP, docs y flujos criticos |
| SAST | Semgrep + CodeQL | PR y nightly |
| SCA | `pnpm audit`, Trivy y Dependabot; Dependency Review si GHAS esta disponible | Dependencias vulnerables |
| Secrets | Gitleaks + GitHub Secret Scanning | Local, PR y repo settings |
| IaC | Checkov o Trivy config | CDK/CloudFormation |
| DAST | Nuclei u OWASP ZAP baseline | Entornos vivos |
| SBOM | CycloneDX o Syft | Release |
| Attestation | GitHub artifact attestation o Cosign keyless | Release |
| Observability | CloudWatch, X-Ray/OpenTelemetry, alarms | Runtime |

Baseline minimo para `bus-impl`:

- `Biome + TypeScript + Vitest + OpenAPI diff + Semgrep + Trivy + Gitleaks + Checkov`.

Baseline regulado:

- agregar `CodeQL`, `SBOM`, `attestation`, DAST y rollback automatico. Dependency Review se activa
  cuando GitHub Advanced Security esta disponible para el repositorio.

---

## 6. Secrets, OIDC y configuracion

Reglas:

- No usar AWS access keys estaticas en GitHub Actions.
- Usar `aws-actions/configure-aws-credentials` con OIDC.
- Guardar secretos operativos en Secrets Manager o SSM Parameter Store.
- No guardar secretos reales en fixtures, ejemplos, docs ni tests.
- Activar GitHub Secret Scanning y push protection.
- Rotar credenciales administradas y tokens de docs.
- Comparar secretos con `crypto.timingSafeEqual()` cuando aplique.

Ejemplo OIDC:

```yaml
- name: Configure AWS credentials
  uses: aws-actions/configure-aws-credentials@v6
  with:
    role-to-assume: ${{ secrets.AWS_DEPLOY_ROLE_ARN }}
    aws-region: ${{ env.AWS_REGION }}
```

---

## 7. Preview environments

Crear preview por PR cuando cambien:

- endpoints publicos
- contratos OpenAPI
- autenticacion/autorizacion
- flujos de emision, renovacion, product o constancia
- infraestructura CDK critica

Reglas:

- stack temporal con nombre `bus-impl-pr-<numero>`.
- TTL maximo 24 horas.
- destruccion automatica en `pull_request.closed`.
- smoke HTTP obligatorio.
- Playwright request tests sobre `/health`, `/ready`, `/docs-json` y endpoints criticos.
- DAST solo contra preview/staging, no contra local.

---

## 8. Husky y gobierno local

La defensa local debe ser rapida; CI sigue siendo la autoridad final.

Estructura:

```text
.husky/
|-- pre-commit      # lint-staged + Biome
|-- commit-msg      # ticket Jira + tipo + descripcion
`-- pre-push        # branch naming + lint + typecheck + unit tests
```

`pre-commit`:

```bash
pnpm lint-staged # ejecuta validaciones solo sobre archivos staged
```

`lint-staged`:

```json
{
  "*.{ts,tsx,js,jsx,mjs,cjs}": ["biome check --write --no-errors-on-unmatched"],
  "*.{json,md,yml,yaml}": ["biome format --write --no-errors-on-unmatched"]
}
```

`commit-msg`:

```bash
vigilio-governance validate-commit-message --message-file "$1"
```

`pre-push`:

```bash
vigilio-governance validate-branch-name --branch-name "$(git branch --show-current)"
pnpm prepush:verify # ejecuta validaciones locales antes de push
```

Reglas:

- No correr toda la suite de integracion en `pre-commit`.
- No usar `biome ci` en `lint-staged`; `ci` es solo lectura.
- Usar commits con ticket y tipo: `[ABC-123] - feat: descripcion corta`.
- las ramas deben seguir un patron estricto: `feat/ABC-123/descripcion-corta`, `fix/ABC-456/descripcion-corta`, `hotfix/ABC-789/descripcion-corta`.
- el ticket del commit debe coincidir con el ticket de la rama cuando se trabaja en rama de feature/fix.
- Husky ayuda, pero no es control de seguridad suficiente; CI debe validar lo mismo.

Regex recomendada:

```regex
^(feat|fix|hotfix|refactor|docs|test|ci|build|chore|perf)\/[A-Z][A-Z0-9]+-[0-9]+\/[a-z0-9-]+$
```

Ejemplos validos:

- `feat/ABC-123/crear-product`
- `fix/ABC-456/corregir-openapi`
- `hotfix/ABC-789/reintento-sqs`

La implementacion no se duplica en cada repo. Vive en
`@vigilioyonatan/devsecops-governance` y se consume asi:

```bash
vigilio-governance validate-branch-name --branch-name feat/ABC-123/descripcion-corta
vigilio-governance validate-pr-title \
  --title "[ABC-123] - feat: Descripcion corta" \
  --branch-name feat/ABC-123/descripcion-corta
vigilio-governance validate-pr-body --body-file pr-body.txt
vigilio-governance validate-pr-risk --body-file pr-body.txt
```

---

## 9. Branch protection y GitHub governance

`main` debe tener:

- pull request obligatorio.
- minimo 1 approval.
- CODEOWNERS review para carpetas criticas.
- conversation resolution obligatoria.
- status check requerido estable: `Required CI Gate`, que consolida Biome, typecheck, tests,
  OpenAPI, security, CDK y build segun la matriz de cambios.
- no force-push.
- no bypass salvo break-glass auditado.
- Dependabot alerts habilitado.
- Dependency Review en PR si el plan/repositorio soporta GitHub Advanced Security; de lo contrario,
  mantener `pnpm audit --audit-level=high` y Trivy.
- Secret scanning y push protection habilitados.
- CodeQL en PR o al menos nightly sobre `main`.
- titulo de PR con ticket visible: `[ABC-123] - feat: Descripcion corta`.
- commits del PR con ticket visible: `[ABC-123] - feat: descripcion corta`.
- el branch source del PR debe cumplir la regex oficial del equipo.
- si cambia `packageManager`, `pnpm-workspace.yaml`, `pnpm-lock.yaml` o `engines`, pedir review de plataforma.

Archivos recomendados:

```text
.github/
|-- CODEOWNERS
|-- pull_request_template.md
|-- dependabot.yml
`-- workflows/
    |-- ci.yml
    |-- security.yml
    |-- preview.yml
    `-- deploy.yml
```

Checklist de PR:

```markdown
- [ ] La rama cumple `feat/ABC-123/descripcion-corta` o equivalente permitido
- [ ] El titulo del PR cumple `[ABC-123] - feat: Descripcion corta`
- [ ] Los commits cumplen `[ABC-123] - feat: descripcion corta`
- [ ] El ticket Jira existe o la excepcion esta documentada
- [ ] Tests unitarios agregados/actualizados
- [ ] Integration tests actualizados si toca PostgreSQL, Drizzle o repositorios
- [ ] OpenAPI exportado si toca controller, DTO o schema
- [ ] Biome CI pasa localmente
- [ ] No contiene secretos, tokens ni credenciales
- [ ] `packageManager`, `engines` y `pnpm-workspace.yaml` no cambiaron accidentalmente
- [ ] CDK synth/diff revisado si toca infraestructura
- [ ] Runbook actualizado si cambia operacion o rollback
```

---

## 10. Supply chain

Controles obligatorios:

| Control | Regla |
|---|---|
| Dependency Review | Activar con GHAS; sin GHAS usar audit/Trivy y revision de licencias |
| Dependabot | Alerts y PRs automaticos para parches |
| SBOM | Generar SPDX o CycloneDX en releases |
| Attestation | Publicar provenance para artifacts criticos |
| SARIF | Subir resultados de CodeQL, Semgrep, Trivy y Checkov cuando aplique |
| Artifact retention | Definir retencion para coverage, OpenAPI, SARIF y CDK synth |

Para Lambda ZIP:

- generar SBOM del paquete final.
- firmar o atestar artifact del build.
- desplegar solo artifacts producidos por CI.

Para container opcional:

- escanear imagen con Trivy.
- firmar imagen con Cosign keyless.
- verificar firma antes de deploy.

---

## 11. Jira, IA y practicas staff

Estas practicas vienen del baseline senior de referencia, pero deben activarse segun madurez del equipo.

### Jira automation

- La rama debe incluir ticket y tipo: `feat/ABC-123/crear-product`.
- El titulo del PR debe incluir el ticket y tipo: `[ABC-123] - feat: Crear product`.
- Los commits deben incluir el ticket y tipo: `[ABC-123] - feat: crear product`.
- Al abrir PR, mover ticket a `In Progress`.
- Al aprobar PR, mover ticket a `Ready for QA`.
- Al desplegar en development, comentar build y environment.
- Al desplegar en production, cerrar ticket o mover a `Done` segun flujo del equipo.

Niveles de control recomendados:

- nivel minimo: validar regex del branch y del PR title.
- nivel bueno: extraer el ticket y comentar el PR con enlace a Jira.
- nivel fuerte: consultar Jira REST API y fallar si el issue no existe o esta en estado invalido para deploy.

Ejemplo:

```yaml
branches:
  - pattern: '^(feat|fix|hotfix|refactor|docs|test|ci|build|chore|perf)/ABC-\d+/.+$'
    auto-link: true

transitions:
  - trigger: pull_request_opened
    transition: 'In Progress'
  - trigger: pull_request_approved
    transition: 'Ready for QA'
  - trigger: deploy-development
    transition: 'Deployed to Dev'
  - trigger: deploy-production
    transition: 'Done'
```

Consulta recomendada para validar que el issue exista:

```text
GET https://tu-dominio.atlassian.net/rest/api/3/issue/ABC-123
```

Si la respuesta es `404`, el pipeline debe fallar.

### IA asistida

Uso recomendado:

- PR reviewer asistido para detectar riesgos, diffs grandes y missing tests.
- Semgrep AI o reglas Semgrep curadas para patrones de seguridad.
- Amazon DevOps Guru o alertas con ML si el equipo ya opera observabilidad AWS avanzada.
- Generacion asistida de tests solo como borrador; los tests finales deben revisarse por el equipo.

Regla:

- IA ayuda a revisar, no reemplaza code review humano ni gates automatizados.

### FinOps preventivo

Si el PR toca CDK:

- ejecutar Infracost o estimacion equivalente.
- comentar impacto mensual estimado.
- requerir aprobacion extra si crea NAT Gateway, RDS/Aurora, OpenSearch, WAF avanzado o recursos always-on.

### Plataforma interna

Para varios servicios `bus-impl`, conviene evaluar Backstage o portal interno:

- catalogo de servicios con owner y runbook.
- template que cree modulo DDD + pipeline + CDK + observability.
- health score por servicio: tests, coverage, security, SLO, docs.

---

## 12. CI cache strategy

Cachear lo determinista; nunca cachear seguridad, deploy ni smoke.

Nota:

- esta seccion habla del cache de CI/CD.
- el cache de aplicacion/runtime vive en `9-cache.md`.

Cache recomendado:

- pnpm store con `actions/setup-node` + `cache: pnpm`.
- `.tsbuildinfo` si TypeScript incremental esta habilitado.
- `.vitest` o cache de Vitest si se usa en CI.
- `.nx/cache` solo si el repo adopta Nx.
- Docker layer cache solo si `bus-impl` se empaqueta como container.

No cachear:

- `security`
- `smoke`
- `e2e`
- `deploy`
- `cdk diff`
- `db:migrate`

Objetivo:

- PR feedback de calidad en menos de 3 minutos para cambios pequenos.
- pipeline completo con seguridad y deploy en menos de 12 minutos cuando aplique.

---

## 13. Deploy seguro y rollback

Antes de desplegar:

- tests verdes.
- OpenAPI sin breaking changes no aprobados.
- `cdk diff` revisado.
- scans sin findings `CRITICAL` o `HIGH` sin excepcion aprobada.
- smoke plan listo.

Despues del deploy:

- `GET /health`
- `GET /ready`
- `GET /docs-json` si docs estan habilitados en el entorno.
- smoke de endpoint critico.
- validacion de alarmas, logs y trazas.

Produccion:

- approval manual.
- canary o blue/green cuando el servicio lo permita.
- monitoreo de 15 minutos.
- rollback automatico si suben `5XX`, latencia P99 o errores de negocio criticos.
- runbook de rollback por bounded context.

---

## 14. DAST y runtime security

DAST debe correr contra preview, development o staging:

- Nuclei con templates HTTP baseline.
- OWASP ZAP baseline si el equipo ya lo opera.
- rate limit para no afectar servicios compartidos.
- exclusions versionadas para falsos positivos aceptados.

No ejecutar DAST agresivo contra production sin ventana aprobada.

---

## 15. DevSecOps Definition of Done

Un cambio de `bus-impl` esta listo si cumple:

- respeta DDD y no mete Nest/Drizzle/AWS en `domain/`.
- valida contratos con Zod.
- DTOs derivan de schemas base con `pick`, `omit`, `extend` o `partial`.
- Swagger/OpenAPI se genera desde Nest y Scalar consume el mismo spec.
- Vitest cubre unit e integration segun riesgo.
- PostgreSQL real se usa en integration tests.
- Playwright o smoke HTTP valida endpoints criticos.
- Biome y TypeScript strict pasan.
- OpenAPI diff no tiene breaking changes no aprobados.
- CDK synth/diff pasa si toca infraestructura.
- security scans pasan o tienen excepcion aprobada.
- no hay secretos en codigo, fixtures ni docs.
- rollback y runbook estan claros si cambia comportamiento productivo.

---

## 16. Mejora frente al repositorio anterior

El `bus-impl` original estaba bien encaminado, pero el baseline 2026 mejora:

- Azure DevOps -> GitHub Actions.
- access keys en pipeline -> OIDC.
- Jest/Cucumber -> Vitest/Playwright.
- ESLint/Prettier -> Biome.
- Joi -> Zod.
- YAML infra dispersa -> CDK.
- docs manuales -> OpenAPI exportado desde Nest + Scalar.
- deploy lineal -> smoke, DAST, canary/rollback y observabilidad.

---

## 17. CI/CD fuerte por stage

Regla de oro:

- compilar una sola vez.
- generar digest, SBOM y attestation en CI.
- promover el mismo artefacto por `development`, `staging` y `production`.
- no volver a correr build en el job de deploy.
- cada stage usa cuenta AWS, rol OIDC y `GitHub Environment` distinto.

Pipeline recomendado:

```text
pull_request
  -> quality
  -> integration
  -> contract
  -> security
  -> package
  -> sbom + attestation
  -> preview opcional

workflow_dispatch desde main a development
  -> mismo artifact digest
  -> verify attestation
  -> deploy development
  -> smoke + DAST baseline

merge a main
  -> promotion automatica a staging
  -> smoke + contract replay + observability

workflow_dispatch desde main a production
  -> mismo artifact digest
  -> verify attestation
  -> manual approval
  -> canary o blue/green
  -> observability gate
  -> rollback automatico si falla
```

Matriz de control recomendada:

| Stage | Fuente | Proteccion | Seguridad extra | Deploy |
|---|---|---|---|---|
| `development` | `main` | environment opcional | smoke y contrato | manual |
| `staging` | `main` | environment protegido | DAST, observabilidad y rollback | automatico o manual controlado |
| `production` | `main` | reviewers, no self-review, no bypass | attestation, freeze window y alarm gate | manual + canary |

Reglas:

- PRs desde forks no reciben secretos ni permisos OIDC.
- evitar `pull_request_target` para ejecutar codigo no confiable.
- todos los stages desplegables salen de `main`; `test` es un modo de CI, no una rama ni stage CDK.
- `production` solo despliega manualmente desde `main`; nunca desde `feat/*`, `fix/*` o `hotfix/*`.

---

## 18. Hardening de GitHub Actions y OIDC

### Permisos minimos por job

No dar permisos globales amplios al workflow completo. Recomendacion:

- por defecto: `contents: read`.
- jobs de security: `security-events: write`.
- jobs de attestation: `id-token: write` + `attestations: write`.
- jobs de deploy: `id-token: write` y solo lo minimo adicional que exija la accion usada.

Ejemplo:

```yaml
permissions:
  contents: read

concurrency:
  group: deploy-${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: false

jobs:
  package:
    permissions:
      contents: read
      id-token: write
      attestations: write
    steps:
      - uses: actions/checkout@v6
        with:
          persist-credentials: false
      - run: pnpm install --frozen-lockfile
      - run: pnpm build
      - uses: actions/upload-artifact@v4
        with:
          name: bus-impl-package
          path: dist/bus-impl.zip
      - uses: actions/attest@v4
        with:
          subject-path: dist/bus-impl.zip

  deploy-production:
    environment: production
    permissions:
      contents: read
      id-token: write
    steps:
      - uses: actions/download-artifact@v4
        with:
          name: bus-impl-package
      - run: gh attestation verify dist/bus-impl.zip -R ${{ github.repository }}
      - run: pnpm cdk:deploy:production
```

### Reglas de workflow

- usar `concurrency` para impedir despliegues solapados por environment.
- definir `timeout-minutes` en jobs costosos.
- usar `persist-credentials: false` en `actions/checkout` cuando no se necesita escribir al repo.
- pinear acciones de terceros por commit SHA en pipelines regulados.
- separar `ci.yml`, `security.yml`, `preview.yml` y `deploy.yml`.
- para varios servicios, preferir reusable workflows con `workflow_call`.

### OIDC fuerte con AWS

Reglas:

- un rol IAM por environment: `bus-impl-dev`, `bus-impl-staging`, `bus-impl-prod`.
- el trust policy debe validar `aud` y `sub`.
- no usar wildcard amplio para `production`.
- si el workflow usa `environment`, el `sub` debe apuntar al nombre del environment.

Ejemplo recomendado para `production`:

```json
{
  "Condition": {
    "StringEquals": {
      "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
      "token.actions.githubusercontent.com:sub": "repo:tu-org/tu-repo:environment:production"
    }
  }
}
```

Reglas:

- `development` puede permitir `repo:tu-org/tu-repo:environment:development`.
- `staging` y `production` deben tener roles separados y minimo privilegio.
- `production` no debe aceptar `repo:tu-org/tu-repo:*`.
- si se usan `GitHub Environments`, activar branch restrictions, required reviewers y no self-review.

---

## 19. pnpm, `.npmrc` y hardening de supply chain

Punto importante:

- en pnpm 11, los settings no sensibles van en `pnpm-workspace.yaml`.
- `.npmrc` seguro puede commitearse si no contiene tokens reales.
- `.npmrc` sirve para forzar registry privado por scope, auth via variables y reglas de instalacion.
- tokens reales viven en secrets de CI, `~/.npmrc` del usuario o vault corporativo.

### `.npmrc` seguro

Reglas:

- no guardar tokens reales en el repo.
- usar variables de entorno para tokens de registry.
- si se necesita `tokenHelper`, configurarlo solo en el `.npmrc` del usuario, no en el del proyecto.

Ejemplo:

```ini
engine-strict=true
fund=false
audit=true
save-exact=true
package-manager-strict=true
strict-peer-dependencies=true
auto-install-peers=false
prefer-frozen-lockfile=true
verify-store-integrity=true
@vigilio-services:registry=https://npm.pkg.github.com
@vigilioyonatan:registry=https://npm.pkg.github.com
always-auth=true
```

El `.npmrc` versionado no contiene `_authToken`. La credencial se escribe en `~/.npmrc` mediante la
accion `configure-github-packages` o configuracion local y requiere `read:packages`.

En GitHub Actions:

```yaml
permissions:
  contents: read
  packages: read

steps:
  - run: pnpm install --frozen-lockfile
    env:
      GITHUB_PACKAGES_TOKEN: ${{ secrets.GITHUB_PACKAGES_TOKEN }}
```

Si el paquete privado vive en el mismo owner/repo y la organizacion lo permite, puede usarse `${{ github.token }}` o `${{ secrets.GITHUB_TOKEN }}` con `packages: read`.

### `pnpm-workspace.yaml` endurecido

Configuracion recomendada para `bus-impl`:

```yaml
nodeVersion: 24.16.0
engineStrict: true
preferFrozenLockfile: true
verifyStoreIntegrity: true
strictStorePkgContentCheck: true
verifyDepsBeforeRun: error
strictDepBuilds: true
dangerouslyAllowAllBuilds: false
blockExoticSubdeps: true
minimumReleaseAge: 1440
minimumReleaseAgeStrict: true
minimumReleaseAgeIgnoreMissingTime: false
trustPolicy: no-downgrade
trustLockfile: false
resolutionMode: time-based
registries:
  default: https://registry.npmjs.org/
allowBuilds:
  esbuild: true
  '@swc/core': true
```

Lectura de estas reglas:

- `minimumReleaseAge` baja el riesgo de instalar un release recien comprometido.
- `minimumReleaseAgeIgnoreMissingTime: false` falla si el registry no da metadata suficiente.
- `trustPolicy: no-downgrade` evita instalar una version con menor evidencia de confianza que releases anteriores.
- `blockExoticSubdeps: true` bloquea subdependencias con fuentes exoticas no confiables.
- `strictDepBuilds: true` obliga a revisar scripts de instalacion de dependencias.
- `allowBuilds` deja explicito que paquetes pueden ejecutar build scripts.
- `trustLockfile: false` mantiene la verificacion de supply chain incluso cuando ya existe lockfile.

### Flujo seguro de dependencias

- fijar `packageManager` exacto en `package.json`: `pnpm@11.7.0`.
- fijar `engines.node` y `engines.pnpm`.
- correr `pnpm install --frozen-lockfile` en CI.
- revisar nuevas dependencias con `pnpm approve-builds`.
- usar Dependabot y, cuando GHAS este disponible, Dependency Review.
- no aceptar `git+ssh`, tarballs directos o registries raros sin excepcion documentada.
- proteger `packageManager`, `engines`, `pnpm-workspace.yaml` y `pnpm-lock.yaml` con review obligatoria.
- si cambia la version de `pnpm` o `Node`, el PR debe explicarlo y pasar por plataforma.

### Reglas para el repo

- `.npmrc` seguro y sin tokens reales puede estar commiteado.
- `pnpm-lock.yaml` es obligatorio y parte del control de cambios.
- cambios de lockfile sin cambios de `package.json` deben revisarse con mas cuidado.
- cualquier excepcion a `allowBuilds`, `trustPolicy` o `minimumReleaseAge` debe quedar documentada en PR.
- evitar tener un `.npmrc` commiteado con auth real; si el equipo quiere ejemplos de tokens, usar `.npmrc.example`.
- si el registry interno usa CA privada, documentar `cafile` o `ca` en el `.npmrc` del desarrollador, no en el repo con secretos.

---

## 20. Governance checks en CI

Buenas practicas fuertes para `ci.yml`:

- primer job: `governance`.
- ese job falla rapido si el branch, PR title, Jira key o policy de package manager no cumplen.
- no gastar minutos de integration, security o deploy si el gobierno basico ya fallo.

Checks recomendados:

| Check | Regla |
|---|---|
| Branch name | `feat/ABC-123/descripcion-corta` o prefijo permitido |
| PR title | `[ABC-123] - feat: Descripcion corta` |
| Commit message | `[ABC-123] - feat: descripcion corta` |
| Jira issue | existe en Jira y no esta cerrado para trabajo nuevo |
| `packageManager` | exacto y pinneado, por ejemplo `pnpm@11.7.0` |
| `engines` | coherentes con CI y `pnpm-workspace.yaml` |
| Lockfile drift | si cambia `pnpm-lock.yaml`, revisar manifests relacionados |
| Version drift | si cambia `nodeVersion`, `packageManager` o `engines`, exigir review de plataforma |

Ejemplo de job:

```yaml
jobs:
  governance:
    name: Governance
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pull-requests: read
    steps:
      - uses: actions/checkout@v6
        with:
          fetch-depth: 0
          persist-credentials: false
      - uses: pnpm/action-setup@v4
        with:
          version: '11.7.0'
      - uses: actions/setup-node@v6
        with:
          node-version: '24.16.0'
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - name: Validate branch name
        run: vigilio-governance validate-branch-name --branch-name "${{ github.head_ref || github.ref_name }}"
      - name: Validate PR title
        if: github.event_name == 'pull_request'
        run: >-
          vigilio-governance validate-pr-title
          --title "${{ github.event.pull_request.title }}"
          --branch-name "${{ github.head_ref }}"
      - name: Move Jira issue to Code Review
        if: github.event_name == 'pull_request'
        uses: Vigilio-Services/vigilio-platform-actions/actions/jira-devops@<SHA_COMPLETO>
        with:
          mode: transition
          issue-keys: ${{ github.head_ref }} ${{ github.event.pull_request.title }}
          transition-name: ${{ vars.JIRA_TRANSITION_CODE_REVIEW }}
        env:
          JIRA_BASE_URL: ${{ secrets.JIRA_BASE_URL }}
          JIRA_USER_EMAIL: ${{ secrets.JIRA_USER_EMAIL }}
          JIRA_API_TOKEN: ${{ secrets.JIRA_API_TOKEN }}
      - name: Validate package manager policy
        run: vigilio-governance validate-package-manager
```

`vigilio-governance validate-package-manager` y `validate-platform-baseline` revisan como minimo:

- `package.json.packageManager === 'pnpm@11.7.0'`
- `package.json.engines.node` alineado a `24.x`
- `package.json.engines.pnpm` alineado a `11.7.0`
- `pnpm-workspace.yaml.nodeVersion` alineado a `24.16.0`
- si cambian esas llaves, exigir aprobacion de plataforma o label especial

Regla fuerte:

- Husky mejora DX.
- CI aplica la ley.
- si alguien salta Husky, el PR igual debe caer.

> Fuente única para **Correcto / Incorrecto: revisión 2026**: [abrir documento canónico](../../../governance/documentation-dry-and-ownership.md).

### ✅ Correcto / ❌ Incorrecto — DevSecOps y Calidad - `bus-impl` 2026

✅ **Correcto:** Para **DevSecOps y Calidad - `bus-impl` 2026**, bloquear promoción si faltan pruebas reales, firma/artifact y aprobación pertinente.

❌ **Incorrecto:** En **DevSecOps y Calidad - `bus-impl` 2026**, dar por exitoso un release porque existe YAML o usar tokens de despliegue permanentes.
