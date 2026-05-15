# Ambientes de Trabajo - `bus-impl` 2026

Este documento define como trabajar el backend en `local`, `development`, `staging` y `production`. `NODE_ENV=test` es un modo de pruebas local/CI, no un stage CDK.

---

## 1. Stages canonicos

| Stage | Objetivo | Cuenta/infra | Despliegue | Controles minimos |
|---|---|---|---|---|
| `local` | desarrollo en maquina | PostgreSQL via Podman/Docker + `.env` ignorado por Git | manual | sin secretos reales de prod, docs habilitadas |
| `test` (modo) | validacion funcional y tecnica | runners CI + PostgreSQL/Floci aislados | no despliega CDK | unit, integration, BDD, e2e y contratos |
| `development` | integracion cloud | cuenta AWS dedicada de desarrollo | manual desde `main` | smoke y contratos, docs controladas |
| `staging` | ensayo pre-productivo | cuenta AWS dedicada casi identica a prod | automatico desde `main` o manual | smoke, DAST, rollback y observabilidad |
| `production` | trafico real | cuenta AWS dedicada productiva | manual desde `main` | canary o blue/green, reviewers, no bypass |

Reglas:

- `development`, `staging` y `production` no comparten cuenta AWS.
- `production` no comparte VPC, RDS, S3 de artefactos, KMS ni Secrets Manager con lower environments.
- integration/E2E prueban el codigo antes de construir el artefacto cloud; staging/production verifican el artefacto firmado correspondiente al SHA.

---

## 2. Aislamiento fuerte por cuenta, red y secretos

Reglas obligatorias:

- una cuenta AWS por `development`, `staging` y `production`.
- un bucket de artefactos por cuenta o por ambiente, con cifrado y politicas separadas.
- una llave KMS por ambiente para secretos y artefactos sensibles.
- un `GitHub Environment` por stage: `development`, `staging`, `production`.
- secretos de `production` nunca deben existir en development ni runners de test.
- snapshots de base usados fuera de prod deben anonimizase o sanearse.
- no usar bases compartidas entre `development` y `production`.
- no usar usuarios IAM comodin entre stages; cada stage asume su propio rol OIDC.

Politica de datos:

- `development`: datos fake o seeds del equipo.
- `test`: fixtures sinteticos y bases efimeras por suite/job.
- `staging`: dataset mas cercano a prod, pero anonimizado.
- `production`: solo datos reales, con accesos auditados.

---

## 3. Desarrollo local

### Dependencias base

- Node.js `24.16.0` (`>=24 <25`)
- pnpm `11.7.0`
- Podman o Docker para PostgreSQL local de integration/e2e
- AWS CLI solo cuando el flujo realmente requiera credenciales reales

### Flujo recomendado

```bash
pnpm install --frozen-lockfile # instala dependencias exactas desde pnpm-lock.yaml sin modificarlo
pnpm test:integration # levanta PostgreSQL local con Podman/Docker si no existe y prueba repositorios reales
pnpm drizzle:check # verifica consistencia de migraciones Drizzle
pnpm start:dev # levanta servidor local con watch sin build previo
```

### Scripts recomendados

```json
{
  "scripts": {
    "start:local": "tsx src/main.ts",
    "start:dev": "tsx watch src/main.ts",
    "start:prod": "node dist/src/main.js",
    "start:prod:local": "pnpm build && node dist/src/main.js",
    "start:prod:local:aws": "tsx scripts/start-prod-like-local.ts",
    "lint": "biome ci .",
    "typecheck": "tsc --noEmit && tsc --noEmit -p tsconfig.cdk.json",
    "test": "vitest run",
    "test:integration": "vigilio-node setup-e2e-db && vitest run --config vitest.integration.config.ts",
    "test:e2e": "playwright test",
    "openapi:export": "tsx scripts/export-openapi.ts",
    "cdk:synth": "pnpm build:lambda && tsc --noEmit -p tsconfig.cdk.json && cdk synth"
  }
}
```

`vigilio-node` viene de `@vigilioyonatan/node-nest-tooling`; no requiere copiar un script de setup
de base de datos al proyecto.

Reglas:

- local no debe depender de secretos de `production`.
- si se usa `.env.local`, debe estar en `.gitignore`.
- las credenciales de registro npm privado van en auth file local, no en el repo.
- `pnpm test:integration` debe ser autosuficiente en local: si no hay PostgreSQL en `${E2E_DATABASE_HOST}:${E2E_DATABASE_PORT}`, usa Podman/Docker para crear o iniciar `${PROJECT_SLUG}-postgres-e2e`.
- si usas una base externa, define `E2E_DATABASE_ADMIN_URL`, `E2E_DATABASE_URL` y opcionalmente `E2E_AUTO_START_POSTGRES=false`.

---

## 4. Variables de entorno

Reglas:

- NestJS carga configuracion con `ConfigModule.forRoot({ isGlobal: true, validate })`.
- la validacion vive en `src/shared/infrastructure/config/environment.schema.ts`.
- dentro de controllers, services, guards y repositories se usa `ConfigService`, no `process.env`.
- todo se valida con Zod al iniciar; si algo esta mal, la app no arranca.
- local usa `.env`, `.env.local` o `.env.<APP_STAGE>`.
- cloud usa variables inyectadas por CDK/Lambda y secretos desde Secrets Manager o SSM.
- cada stage usa sus propios secretos, no secretos compartidos copiados a mano.

Variables minimas:

| Variable | Uso |
|---|---|
| `NODE_ENV` | `development`, `test` o `production` |
| `PORT` | puerto local |
| `DATABASE_URL` | PostgreSQL local o remoto |
| `DATABASE_SECRET_ARN` | secreto RDS en AWS cuando aplica |
| `AWS_REGION` | region del stack |
| `APP_STAGE` | stage funcional |
| `JWT_SECRET` | secreto JWT minimo 32 caracteres |
| `GOOGLE_CLIENT_ID` | OAuth Google si se usa login Google |
| `API_DOCS_ENABLED` | habilita UI de docs; production la desactiva por defecto |
| `APP_CONFIG_SECRET_ID` | secreto JSON de configuracion sensible de la aplicacion |
| `SQS_*` / `SNS_*` / `SFN_*` | recursos async |

Reglas de seguridad:

- `APP_CONFIG_SECRET_ID` referencia Secrets Manager; el contenido nunca vive en repo.
- tokens de CI/CD no se imprimen en logs.
- cualquier secreto de terceros rota por ambiente, no uno global para todo.

---

## 5. Swagger, Scalar y OpenAPI por ambiente

### Local

- Scalar habilitado como UI principal.
- rutas sugeridas:
  - `/reference` para Scalar
  - `/docs` para Swagger UI opcional
  - `/openapi.json` para el spec
- bundle, logo y favicon de Scalar autoalojados; no se permiten CDN externos ni fuentes remotas.
- export de `openapi.json` y `openapi.yaml` en CI.

### Development

- docs habilitadas solo si ayudan al equipo.
- auth adicional obligatoria si el entorno es compartido.
- no exponer docs al internet publico sin control de acceso.

### Testing y staging

- docs opcionales.
- si estan habilitadas, deben requerir auth adicional, VPN o allowlist.
- se valida diff del contrato contra la rama base.

### Production

- preferible publicar solo el artefacto OpenAPI.
- Scalar y Swagger UI estan deshabilitados por defecto.
- si la UI vive en produccion, requiere flag explicito, control de acceso y assets del mismo origen.
- no ampliar `script-src` con `unsafe-inline` ni dominios CDN para resolver errores CSP.
- si no hay necesidad operativa real, mejor deshabilitarlas.
- aplicar la receta de [Scalar y OpenAPI seguros en produccion](../../../stacks/backend/nestjs/http/references/47-scalar-openapi-produccion.md).

---

## 6. Promotion path del artefacto

Flujo recomendado:

```text
feat/*, fix/*, hotfix/* -> pull request -> CI + security + package
          -> preview opcional
main + workflow manual -> deploy development
main -> deploy staging
main + workflow manual + approvals -> deploy production
```

Reglas:

- el artefacto se construye una sola vez en CI.
- cada deploy usa un cloud assembly y artefacto inmutable ligado al SHA, con manifest y firma KMS.
- no desplegar builds locales ni artefactos sin digest verificado.
- toda promotion debe dejar evidencia: commit SHA, workflow run, environment y artifact digest.

---

## 7. GitHub Environments y protection rules

Configuracion recomendada:

| Environment | Branch/tag permitido | Aprobacion | Regla adicional |
|---|---|---|---|
| `development` | `main`, manual | opcional | sin secrets de prod |
| `staging` | `main` | 1-2 reviewers | smoke, DAST y observabilidad |
| `production` | `main`, manual | 2 reviewers o CAB | no bypass, ventana de cambio |

Reglas:

- restringir ramas/tags por environment.
- desactivar self-review en `staging` y `production`.
- si la organizacion lo soporta, desactivar bypass administrativo en `production`.
- usar protection rules para esperar checks externos si el equipo usa Datadog, ServiceNow o similar.

---

## 8. Ambientes efimeros por Pull Request

El flujo recomendado de 2026 para cambios sensibles es crear preview environments temporales:

```text
PR opened -> GitHub Actions -> CDK deploy pr-123 -> tests/smoke -> QA -> destroy on close
```

Casos donde debe ser obligatorio:

- cambios en auth
- cambios en contrato OpenAPI
- cambios en rutas criticas
- cambios en Step Functions o flujos async sensibles

Reglas:

- stack temporal con nombre `bus-impl-pr-<numero>`.
- TTL maximo 24 horas.
- destruccion automatica en `pull_request.closed`.
- smoke HTTP obligatorio.
- Playwright request tests sobre `/health`, `/ready`, `/docs-json` y endpoints criticos.
- preview no hereda secretos de `production`.

---

## 9. Testing local por capas

### Unit

```bash
pnpm test # ejecuta pruebas unitarias rapidas
```

### Integration con PostgreSQL real

```bash
pnpm test:integration # prepara PostgreSQL E2E y prueba repositorios reales
```

### E2E / smoke con Playwright

```bash
pnpm test:e2e # ejecuta pruebas end-to-end contra la app/API real
```

### Export de contrato

```bash
pnpm openapi:export # genera el contrato OpenAPI desde la app
```

---

## 10. Despliegue por stage con CDK

Patron recomendado:

```bash
pnpm cdk synth --context stage=development # sintetiza CloudFormation para development
pnpm cdk diff --context stage=development # muestra diferencias de infraestructura antes de desplegar
pnpm cdk deploy --context stage=development # despliega infraestructura development
```

Reglas:

- antes del deploy, descargar el artefacto generado por CI y verificar su attestation.
- no desplegar codigo compilado localmente a `development`, `staging` o `production`.
- correr `cdk diff` en cada deploy.
- no tocar recursos manualmente en consola.
- programar drift detection sobre CloudFormation.

---

## 11. Branching recomendado

| Rama | Uso |
|---|---|
| `feat/<TICKET>/*`, `fix/<TICKET>/*`, `hotfix/<TICKET>/*` | trabajo diario de corta vida |
| `main` | unica rama larga; fuente de todos los stages |

Reglas:

- `feat/*`, `fix/*` y `hotfix/*` nunca despliegan directo a un stage compartido.
- `main` no debe recibir pushes directos.
- no se mantienen ramas largas `develop`, `staging` ni `release/*`.
- `development`, `staging` y `production` son GitHub Environments, no ramas.
- la promocion usa el artefacto asociado al SHA validado de `main`.

---

## 12. Diferencia con el `bus-impl` anterior

Antes:

- `npm start`
- Serverless Offline
- Azure variable groups
- menor separacion entre lower envs y produccion

Ahora:

- `pnpm`
- Docker PostgreSQL local
- GitHub Environments
- previews temporales por PR
- despliegue con CDK y OIDC
- promotion de artefacto inmutable
- separation fuerte por cuenta, secreto y approvers

## ✅ Correcto / ❌ Incorrecto: revisión 2026

- ✅ **Correcto:** Leer contexto real, seguir normas canónicas y documentar precondiciones, ejemplos, contraejemplos y verificación.
- ❌ **Incorrecto:** Copiar snippets sin imports, asumir versiones instaladas o declarar pruebas `PASS` sin ejecutarlas.
- **Al recibir código existente:** primero caracterizar el comportamiento, después refactorizar en pasos comprobables. [Guía canónica de modernización](../../../standards/engineering/refactoring-existing-code.md).

> **Referencia histórica completa, migrada sin recortes de contenido técnico.** La norma vigente corresponde a `foundations/` y `standards/`; las especializaciones NestJS están en `stacks/backend/nestjs/`. Ante contradicciones, seguir documentación canónica y pruebas del proyecto. Los enlaces relativos se actualizaron para mantener la navegación.

✅ **Correcto:** aplicar la normativa compartida y adaptar estos ejemplos tras comprobar versiones.

❌ **Incorrecto:** copiar ciegamente un fragmento histórico o imponer reglas de NestJS a Laravel.
