# Resumen de Jobs CI/CD - `bus-impl`

Este documento resume los jobs actuales de `.github/workflows/ci.yml`. Los nombres ejecutables del
workflow son la fuente de verdad.

## Jobs

| Job | Responsabilidad principal | Evidencia |
|---|---|---|
| `changes` | clasifica paths modificados y activa gates por riesgo | outputs para jobs dependientes |
| `governance` | rama, PR, commits, Jira, policies, audit de dependencias y Checkov | logs y resultado del gate |
| `quality` | Biome, TypeScript, unit coverage y Drizzle check | JUnit + coverage |
| `integration` | repositories contra PostgreSQL real | JUnit integration |
| `integration-aws` | integraciones locales cubiertas por Floci | JUnit AWS integration |
| `bdd` | escenarios Cucumber | reporte JSON |
| `contract` | export y diff de OpenAPI | `docs/openapi/openapi.json` |
| `e2e` | Playwright API E2E | JUnit, traces y reporte |
| `e2e-browser` | Chromium para flujos browser existentes | reporte Playwright |
| `infrastructure` | build Lambda, CDK synth e IaC | `cdk.out` |
| `build` | build productivo, SBOM y digests | `dist`, SBOM y SHA-256 |
| `secret-scan` | Gitleaks | resultado del scan |
| `security-deep` | CodeQL, Semgrep y Trivy filesystem/IaC | SARIF |
| `ci-gate` | consolida todos los jobs requeridos | check estable `Required CI Gate` |

## Governance compartido

El job `governance` no depende de validadores `.mjs` copiados:

```text
@vigilioyonatan/devsecops-governance -> vigilio-governance
vigilio-platform-actions/actions/jira-devops
vigilio-platform-actions/actions/configure-github-packages
```

Valida:

- nombre de rama;
- titulo, cuerpo, riesgo y commits del PR;
- existencia y transicion Jira cuando hay credenciales;
- package manager y baseline Node/Nest;
- repository policy y GitHub Actions;
- excepciones de seguridad vigentes.

## Ejecucion selectiva

- cambios solo documentales omiten PostgreSQL, E2E, CDK y scans profundos cuando la matriz lo
  permite;
- cambios en `src`, dependencias, migraciones, tests o workflows activan suites adicionales;
- un job omitido por decision de paths debe quedar como `skipped`, no simular un resultado verde;
- `ci-gate` distingue entre `success`, `skipped`, `failure` y `cancelled`.

## Tooling central y local

`vigilio-platform-actions` publica `shared-backend-node-nest-ci.yml` para nuevos proyectos. El
workflow local de `bus-impl` sigue ejecutandose hasta completar una migracion con paridad demostrada.

Los paquetes centrales aportan:

- `vigilio-governance`: governance y policies;
- `vigilio-node`: setup PostgreSQL, OpenAPI, contratos y packaging Lambda;
- `vigilio-evidence`: DORA, SLSA y evidencia operacional;
- `vigilio-skills`: sincronizacion segura de skills.

Los scripts TypeScript de `bus-impl` permanecen solo cuando contienen comportamiento propio del
servicio.

## Reglas

1. Las acciones externas y reusables remotos se fijan a SHA completo.
2. `ci.yml` no despliega.
3. Deploy usa workflows separados y GitHub Environments.
4. Los artefactos sensibles tienen retencion limitada y acceso restringido.
5. El required check estable es `Required CI Gate`.
6. Cualquier cambio en la matriz de jobs requiere actualizar este resumen.

## ✅ Correcto / ❌ Incorrecto: revisión 2026

- ✅ **Correcto:** Versiones basadas en lockfiles, escaneo dependencias, CI con gates reales, rollback y aprobaciones.
- ❌ **Incorrecto:** Declarar `PASS` sin ejecutar gates, instalar dependencias latest sin compatibilidad o subir secretos a pipelines.
- **Al recibir código existente:** primero caracterizar el comportamiento, después refactorizar en pasos comprobables. [Guía canónica de modernización](../../../standards/engineering/refactoring-existing-code.md).

> **Referencia histórica completa, migrada sin recortes de contenido técnico.** La norma vigente corresponde a `foundations/` y `standards/`; las especializaciones NestJS están en `stacks/backend/nestjs/`. Ante contradicciones, seguir documentación canónica y pruebas del proyecto. Los enlaces relativos se actualizaron para mantener la navegación.

✅ **Correcto:** aplicar la normativa compartida y adaptar estos ejemplos tras comprobar versiones.

❌ **Incorrecto:** copiar ciegamente un fragmento histórico o imponer reglas de NestJS a Laravel.
