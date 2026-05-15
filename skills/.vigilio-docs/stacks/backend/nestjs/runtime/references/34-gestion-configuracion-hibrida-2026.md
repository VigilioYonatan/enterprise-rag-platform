# Gestion de Configuracion Hibrida - `bus-impl` 2026

`bus-impl` carga configuracion segun `APP_STAGE` y valida el resultado completo con Zod antes de
arrancar.

## Stages

```text
APP_STAGE=local        -> archivo .env + process.env
APP_STAGE=development  -> SSM + Secrets Manager + process.env
APP_STAGE=staging      -> SSM + Secrets Manager + process.env
APP_STAGE=production   -> SSM + Secrets Manager + process.env
```

`NODE_ENV=test` es un modo de ejecucion para suites. No es un stage AWS ni una rama.

## Prioridad

De mayor a menor:

1. `process.env`;
2. Secrets Manager;
3. SSM Parameter Store;
4. `.env`, solamente en `APP_STAGE=local`.

Archivos ejecutables:

```text
src/shared/infrastructure/config/config-loader.ts
src/shared/infrastructure/config/environment.schema.ts
src/shared/infrastructure/database/database-url.resolver.ts
```

## Local

```bash
pnpm install
pnpm db:local:setup
pnpm db:seed:local
pnpm start:dev
```

- `.env.example` documenta nombres y valores no sensibles.
- `.env` contiene valores locales y esta ignorado por Git.
- no usar secretos ni snapshots productivos.
- Podman o Docker pueden proveer PostgreSQL para integration/E2E.

## Cloud

CDK inyecta como minimo:

```text
APP_STAGE
AWS_REGION
CONFIG_SSM_PREFIX
APP_CONFIG_SECRET_ID
DATABASE_SECRET_ARN
```

SSM contiene configuracion no sensible:

```text
/bus-impl/<stage>/PORT
/bus-impl/<stage>/DATABASE_POOL_MAX
/bus-impl/<stage>/UPLOAD_BUCKET_NAME
```

Secrets Manager contiene JSON sensible:

```json
{
  "JWT_SECRET": "<secret>",
  "GOOGLE_CLIENT_ID": "<client-id>"
}
```

La URL de PostgreSQL puede venir de `DATABASE_URL` o resolverse desde
`DATABASE_SECRET_ARN`. No documentar passwords, account IDs, correos ni ARNs reales.

## Validacion Zod

`environment.schema.ts` aplica:

- `APP_STAGE`: `local`, `development`, `staging` o `production`;
- `NODE_ENV`: `development`, `test` o `production`;
- puerto valido y limites numericos;
- `JWT_SECRET` de al menos 32 caracteres;
- par completo de `AWS_ACCESS_KEY_ID` y `AWS_SECRET_ACCESS_KEY` si se usan;
- en `staging` y `production`, prohibicion del JWT local;
- en `staging` y `production`, prohibicion de access keys estaticas;
- en `staging` y `production`, `DATABASE_URL` o `DATABASE_SECRET_ARN` obligatorio.

La aplicacion falla al arrancar cuando la configuracion es invalida.

## IAM

Los runtimes cloud usan IAM roles:

- `ssm:GetParametersByPath` limitado al prefijo del stage;
- `secretsmanager:GetSecretValue` limitado a los secretos requeridos;
- permisos separados por cuenta y environment;
- sin access keys persistentes en Lambda o CI.

## CDK y stages

`bus-impl` usa AWS CDK, no Serverless Framework.

```bash
pnpm cdk:diff:development
pnpm cdk:diff:staging
pnpm cdk:diff:production
```

Los deploys normales pasan por GitHub Actions y OIDC. Un deploy local requiere perfil SSO,
autorizacion explicita y no sustituye la evidencia del pipeline.

## Referencia para proyectos existente con Serverless Framework

Un proyecto antiguo que todavia use `${opt:stage}` debe preferir referencias SSM completas sobre
ARNs concatenados manualmente:

```yaml
# Fragil
RESOURCE_ARN: arn:aws:service:${self:provider.region}:${self:custom.accountId}:resource:${opt:stage}

# Preferido durante la migracion
RESOURCE_ARN: ${ssm:/service/${opt:stage}/resource-arn}
```

Esta referencia no describe la implementacion actual de `bus-impl`. Los recursos nuevos del
template se modelan con constructs CDK y outputs/variables tipados.

## Reglas

1. No guardar secretos en Git, docs, fixtures o logs.
2. No usar `test` como stage cloud.
3. No compartir secretos, KMS, buckets ni roles entre stages.
4. No agregar variables sin Zod, owner y clasificacion.
5. Preferir referencias creadas por CDK sobre nombres/ARNs concatenados.
6. Rotar secretos sin requerir cambios de codigo.

> Fuente única para **Correcto / Incorrecto: revisión 2026**: [abrir documento canónico](../../../../../governance/documentation-dry-and-ownership.md).

### ✅ Correcto / ❌ Incorrecto — Gestion de Configuracion Hibrida - `bus-impl` 2026

✅ **Correcto:** Para **Gestion de Configuracion Hibrida - `bus-impl` 2026**, separar configuración y secretos por ambiente, probar arranque y healthchecks.

❌ **Incorrecto:** En **Gestion de Configuracion Hibrida - `bus-impl` 2026**, hardcodear secretos o prometer despliegue sin pruebas en runtime.
