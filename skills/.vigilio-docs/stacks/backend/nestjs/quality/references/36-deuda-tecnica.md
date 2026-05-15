# Registro de Deuda Tecnica - 2026

Este documento registra decisiones y brechas verificables de `bus-impl`. No debe duplicar issues
cerrados ni presentar como implementado un control que depende de configuracion externa.

## 1. Referencias inmutables en GitHub Actions

Estado: implementado en los workflows activos.

- las acciones externas se fijan a SHA completo;
- Dependabot propone actualizaciones auditables;
- `vigilio-governance validate-workflows` bloquea referencias flotantes;
- los reusable workflows de `vigilio-platform-actions` tambien deben consumirse por SHA completo.

La validacion no se copia como script dentro de cada proyecto.

## 2. Gobernanza Jira

Estado: implementado en codigo; configuracion externa requerida.

- `vigilio-platform-actions/actions/jira-devops` centraliza transiciones, deployments, releases,
  incidentes, smart commits y feature flags;
- `bus-impl` consume la accion por SHA;
- los nombres reales de transicion vienen de variables GitHub.

Variables:

```text
JIRA_TRANSITION_CODE_REVIEW
JIRA_TRANSITION_STAGING
JIRA_TRANSITION_PRODUCTION
```

La automatizacion solo funciona si URL, usuario, token, permisos y transiciones existen en Jira.

## 3. GitHub Advanced Security

Estado: depende del plan y configuracion de la organizacion.

- CodeQL y Dependency Review deben habilitarse cuando el plan/repositorio los soporte;
- Trivy, Semgrep, Gitleaks, Checkov y `pnpm audit` mantienen cobertura complementaria;
- ningun scanner individual reemplaza SAST, SCA, secret scanning e IaC scanning combinados.

## 4. Riesgo de PR y governance compartido

Estado: migrado al paquete central.

El gate local antiguo fue reemplazado por:

```bash
vigilio-governance validate-pr-body --body-file pr-body.txt
vigilio-governance validate-pr-risk --body-file pr-body.txt
vigilio-governance validate-repository --policy-file .github/repository-policy.json
vigilio-governance validate-platform-baseline
```

La implementacion vive en `@vigilioyonatan/devsecops-governance`; no debe reaparecer como scripts
copiados dentro de `bus-impl`.

## 5. Deteccion de cambios en `ci.yml`

Estado: deuda consciente.

`ci.yml` conserva logica Bash extensa para decidir que jobs ejecutar. Funciona, pero aumenta el
costo de mantenimiento y puede divergir del reusable workflow central.

Plan:

1. comparar la matriz local con `shared-backend-node-nest-ci.yml`;
2. migrar sin perder los paths y suites especiales de `bus-impl`;
3. mantener `Required CI Gate` como unico check requerido estable;
4. retirar YAML local duplicado solo despues de validar paridad.

## 6. Adopcion de reusable workflows

Estado: parcial.

`vigilio-platform-actions` ya publica CI y deploy CDK reutilizables. `bus-impl` consume actions y
paquetes centrales, pero todavia ejecuta workflows locales extensos.

No se deben borrar los workflows locales hasta demostrar:

- mismos jobs y artefactos;
- mismos permisos minimos;
- soporte de PostgreSQL, Floci, BDD, OpenAPI, Playwright y CDK;
- misma evidencia de deploy, Jira y seguridad;
- rollback probado.

## 7. Controles externos

Estado: no demostrable solo desde Git.

Queda verificar periodicamente:

- ruleset de `main`, merge queue y required checks reales;
- reviewers y no bypass de GitHub Environments;
- AWS OIDC, IAM y KMS desplegados;
- alarmas, dashboards y runbooks operativos;
- restore y rollback drills con evidencia;
- retencion y acceso de artefactos de auditoria.

La presencia de una policy o workflow no demuestra que el control externo este activado.

## 8. Release coordinada de paquetes

Estado: versionado publicado y trazabilidad pendiente de reconciliación.

El snapshot actual de la fuente declara `platform-actions@0.1.0` y los cuatro paquetes en `0.2.0`.
Los consumidores verificados ya usan versiones posteriores en algunos paquetes (`node-nest-tooling`
`0.3.0` en `bus-impl` y `vigilio-skills` `0.3.1` en `web-mfe`). Esto es válido como compatibilidad
de consumo, pero la fuente y la procedencia publicada deben reconciliarse antes de la siguiente
release.

El gate `scripts/validate-compatibility.mjs` registra ambas capas y evita inventar una única versión
que no corresponda al código real. No degradar consumidores para ocultar el drift.

## 9. Nueva release de reusable workflows

Estado: snapshot inmutable consumido; tag histórico no representa la revisión actual.

Los consumidores pueden fijar el SHA completo de una revisión aunque el tag anterior no se mueva.
La próxima release debe actualizar el tag, los package versions, `compatibility.json` y los
consumidores de forma coordinada.

`bus-impl` conserva por ahora `ci.yml` y `secure-deploy-cdk.yml` locales. Solo se migran al reusable
central despues de:

1. publicar y etiquetar la nueva revision;
2. fijar el consumo al SHA de esa release;
3. comprobar paridad de Jira, Floci, BDD, OpenAPI, Playwright, CDK, evidencia y rollback;
4. actualizar el ruleset para requerir el check estable del nuevo workflow.

> Fuente única para **Correcto / Incorrecto: revisión 2026**: [abrir documento canónico](../../../../../governance/documentation-dry-and-ownership.md).

### ✅ Correcto / ❌ Incorrecto — Registro de Deuda Tecnica - 2026

✅ **Correcto:** Para **Registro de Deuda Tecnica - 2026**, emplear métodos DDD semánticos, DTOs Zod y DI camelCase para constructor.

❌ **Incorrecto:** En **Registro de Deuda Tecnica - 2026**, importar ORM dentro de Domain o inventar aliases triviales de ProductSchema.
