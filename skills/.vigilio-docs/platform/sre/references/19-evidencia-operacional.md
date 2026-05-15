# Evidencia Operacional - `bus-impl` 2026

Este documento define que evidencia debe producir el servicio antes de considerarse
production-ready. Si un control importa, debe ejecutarse y dejar un reporte verificable.

## 1. Fuentes de verdad

- `.github/evidence-policy.json` declara archivos esperados, stages productivos y limites.
- `@vigilioyonatan/devsecops-evidence` implementa `vigilio-evidence`.
- `vigilio-platform-actions/.github/workflows/shared-backend-node-nest-deploy-cdk.yml` contiene el
  reusable workflow de referencia.
- los workflows de `bus-impl` son los wrappers y pipelines ejecutados por el servicio.

La documentacion explica el contrato; no reemplaza la policy ni el workflow ejecutable.

## 2. Evidencia minima por Pull Request

El PR ejecuta, segun los paths y riesgos afectados:

- `pnpm lint` y `pnpm typecheck`;
- `pnpm test:coverage:ci`;
- `pnpm test:integration:ci`;
- `pnpm test:integration:aws:ci` cuando cambia una integracion AWS cubierta por Floci;
- `pnpm test:bdd:ci`;
- `pnpm test:e2e:api` y browser E2E cuando corresponda;
- `pnpm openapi:export` y `pnpm openapi:diff`;
- `pnpm cdk:synth`;
- CodeQL, Semgrep, Trivy, Gitleaks, Checkov y dependency audit;
- governance de rama, PR, commits, repository policy, package manager y workflows.

Artefactos esperados:

```text
coverage/
reports/vitest-unit.xml
reports/vitest-integration.xml
reports/vitest-aws-integration.xml
reports/cucumber-report.json
playwright-report/
docs/openapi/openapi.json
cdk.out/
```

La seleccion de jobs puede omitir suites no afectadas, pero `Required CI Gate` debe consolidar el
resultado y fallar cuando un job requerido no termino correctamente.

## 3. Workflows actuales de `bus-impl`

> Implementación y código original en [documento propietario del ejemplo](../../cicd/references/33-guia-github-jira-aws-cicd-2026.md). Consultar allí el bloque completo para evitar copias divergentes.


- `ci.yml`: PR, push y merge queue; no despliega.
- `preview.yml`: OpenAPI y CDK synth sin aplicar infraestructura.
- `release-artifact.yml`: build, SBOM, digests, SLSA provenance y firmas.
- `security-nightly.yml`: SAST, SCA, secrets, IaC y DAST programados.
- `secure-deploy-cdk.yml`: workflow local endurecido de build, verificacion, deploy, smoke y
  evidencia.
- `deploy-development.yml`: manual desde `main`.
- `deploy-staging.yml`: automatico desde `main` y manual controlado.
- `deploy-production.yml`: manual desde `main` con GitHub Environment protegido.
- `dora-metrics.yml`: publica evidencia DORA.
- `governance-audit.yml`: compara la configuracion GitHub con la policy declarada.
- `jira-release.yml`: crea o actualiza releases/Fix Versions en Jira.

`vigilio-platform-actions` mantiene reusable workflows equivalentes para nuevos consumidores. Hasta
que `bus-impl` migre sus wrappers a esos reusables, sus YAML locales siguen siendo la fuente
ejecutada.

## 4. Evidencia por deploy

Cada deploy conserva:

- commit SHA y stage;
- digest SHA-256 del artefacto;
- SBOM CycloneDX;
- SLSA provenance in-toto y firma cuando aplica;
- identidad del rol OIDC, sin credenciales;
- CDK diff;
- resultado de smoke;
- rollback target;
- evidencia de las fases preflight, deploy y smoke.

Archivos definidos por la policy:

```text
reports/artifact-digests-<stage>.txt
reports/artifact-digests-<stage>.txt.sig
reports/slsa-provenance-<stage>.intoto.json
reports/slsa-provenance-<stage>.intoto.json.sig
reports/cdk-diff-<stage>.txt
reports/smoke-<stage>.txt
reports/rollback-target-<stage>.json
reports/operational-evidence-preflight-<stage>.json
reports/operational-evidence-deploy-<stage>.json
reports/operational-evidence-smoke-<stage>.json
```

Comandos:

```bash
pnpm evidence:operational
pnpm devsecops:provenance
pnpm devsecops:dora
```

## 5. Tooling compartido y scripts locales

Automatizacion compartida:

```text
@vigilioyonatan/devsecops-governance -> vigilio-governance
@vigilioyonatan/devsecops-evidence   -> vigilio-evidence
@vigilioyonatan/node-nest-tooling    -> vigilio-node
@vigilioyonatan/vigilio-skills       -> vigilio-skills
```

Scripts propios de `bus-impl`:

```text
scripts/
|-- export-openapi.ts
|-- load-test.ts
|-- run-floci-tests.ts
|-- seed-local-db.ts
|-- smoke-endpoints.ts
`-- start-prod-like-local.ts
```

Reglas:

- no copiar validadores o tooling generico dentro de cada proyecto;
- no usar `postinstall` para escribir archivos en el consumidor;
- ejecutar CLIs desde `node_modules/.bin` mediante scripts `pnpm`;
- mantener en `scripts/` solo comportamiento propio del servicio;
- consumir paquetes y reusable workflows con version o SHA inmutable.

## 6. Release productiva

Produccion requiere:

- `main` como unica fuente de despliegue;
- workflow manual;
- GitHub Environment `production` con reviewers y sin bypass;
- secretos separados por environment;
- AWS OIDC sin access keys persistentes;
- artefacto verificado por digest y provenance;
- SBOM publicado;
- cero findings `HIGH` o `CRITICAL` sin excepcion aprobada y vigente;
- OpenAPI sin breaking changes no aprobados;
- CDK diff, smoke y rollback target archivados;
- dashboards, alarmas y runbooks revisados.

Roles separados:

```text
AWS_ROLE_ARN          -> deploy del environment
AWS_SIGNING_ROLE_ARN  -> firma, sin permisos de deploy
COSIGN_KMS_KEY_URI    -> clave KMS de firma
```

El rol de deploy no debe poder firmar y el rol de firma no debe poder desplegar.

## 7. Estado y brechas reales

Implementado en repositorio:

- evidencia CI/PR;
- SBOM, digests y provenance;
- evidencia preflight/deploy/smoke;
- governance audit y DORA;
- separacion de workflows por responsabilidad.

Requiere configuracion o practica externa:

- reviewers, no bypass y secrets en GitHub Environments;
- bucket de auditoria/Object Lock cuando se habilite archivo de largo plazo;
- restore y rollback drills periodicos con evidencia;
- verificacion operativa de dashboards, alarmas y runbooks.

Un archivo o workflow presente no demuestra por si solo que el control externo este activado.

> Fuente única para **Correcto / Incorrecto: revisión 2026**: [abrir documento canónico](../../../governance/documentation-dry-and-ownership.md).

### ✅ Correcto / ❌ Incorrecto — Evidencia Operacional - `bus-impl` 2026

✅ **Correcto:** Para **Evidencia Operacional - `bus-impl` 2026**, ligar alertas a SLI/SLO y pruebas de recuperación verificables.

❌ **Incorrecto:** En **Evidencia Operacional - `bus-impl` 2026**, declarar recuperabilidad porque existe un backup que nunca se restauró.
