# CDK e IaC AWS - `bus-impl`

Este documento describe la implementacion real de AWS CDK para `bus-impl`.

Estado actual:

- CDK v2 ejecutable.
- `cdk-nag` activo en `cdk synth`.
- stacks separados por responsabilidad.
- stages por contexto: `development`, `staging`, `production`.
- tags y naming centralizados.
- CI ejecuta `pnpm cdk:synth` cuando cambia IaC.

## 1. Estructura

```text
.artifacts/
`-- lambda/ # dist, production node_modules y run.sh; generado
cdk/
|-- bin/
|   `-- app.ts
|-- lib/
|   |-- config/
|   |   |-- naming.ts
|   |   `-- stage-config.ts
|   |-- stacks/
|   |   |-- api.stack.ts
|   |   |-- database.stack.ts
|   |   |-- network.stack.ts
|   |   `-- observability.stack.ts
|   `-- tags/
|       `-- default-tags.ts
`-- cdk.out/
```

`cdk.out/` es generado y no debe versionarse.

## 2. Comandos

```bash
pnpm cdk:synth # valida TypeScript CDK, ejecuta cdk-nag y sintetiza CloudFormation
pnpm cdk:diff # muestra diferencias de infraestructura antes del deploy
pnpm cdk:deploy:development # despliega development sin approval interactivo
pnpm cdk:deploy:staging # despliega staging con approval si amplian permisos
pnpm cdk:deploy:production # despliega production con approval si amplian permisos
```

Para sintetizar un stage especifico:

```bash
pnpm cdk synth --context stage=production # sintetiza stacks de production
```

## 3. Stacks

### Network

`BusImplNetworkStack` crea:

- VPC `10.42.0.0/16`.
- subnets publicas.
- subnets privadas o aisladas segun stage.
- subnets aisladas para database.
- gateway endpoint S3.
- interface endpoint Secrets Manager.
- VPC Flow Logs con retencion por stage.

Decision FinOps:

- `development` usa `natGateways: 0`.
- `staging` usa `1`.
- `production` usa `2`.

## 4. Database

`BusImplDatabaseStack` crea:

- Aurora PostgreSQL Serverless v2.
- PostgreSQL 17 compatible.
- secreto generado en Secrets Manager.
- cifrado con KMS key propia.
- IAM database authentication.
- rotacion automatica del secreto cada 30 dias.
- security group sin acceso publico.

Decision por stage:

| Stage | Deletion protection | Removal policy | Min ACU | Max ACU |
|---|---:|---|---:|---:|
| `development` | no | destroy | `0.5` | `2` |
| `staging` | si | retain | `1` | `8` |
| `production` | si | retain | `2` | `16` |

`cdk-nag` tiene una supresion justificada para `RDS10` solamente en `development`, cuyo database
puede destruirse para controlar costo.

## 5. API

`BusImplApiStack` crea:

- Lambda `nodejs24.x`.
- arquitectura `arm64`.
- AWS Lambda Web Adapter fijado por version.
- artefacto real generado por `pnpm build:lambda`.
- HTTP API.
- stage `$default` con access logs.
- reserved concurrency por stage.
- X-Ray tracing.
- rol IAM custom sin AWS managed policies.
- permisos de lectura de los secrets de DB y aplicacion.
- security group de Lambda con ingreso permitido hacia PostgreSQL.

Importante:

- `pnpm build:lambda` compila ESM, crea un deploy pnpm con dependencias production y genera `run.sh` LF/0755.
- CDK consume `.artifacts/lambda` y usa un hash estable basado en dist, lockfile y configuracion del workspace.
- el pipeline construye antes de `cdk synth`; `cdk.out` contiene el cloud assembly que se firma y promueve.
- `DATABASE_SECRET_ARN` se resuelve en runtime con TLS; fuera de local nunca cae a PostgreSQL localhost.

## 6. Observability

`BusImplObservabilityStack` crea:

- alarma de errores Lambda.
- alarma de throttles Lambda.
- alarma de 5XX HTTP API.

Pendiente para production 10/10:

- SNS topics por stage.
- alarm actions.
- dashboards CloudWatch.
- SLO burn-rate alarms.
- canary synthetics o smoke post-deploy.

## 7. Seguridad

Controles activos:

- `cdk-nag` con `AwsSolutionsChecks`.
- RDS cifrado.
- KMS key con rotacion.
- IAM database authentication.
- Secrets Manager con rotacion.
- Lambda en subnets privadas/aisladas.
- access logs en API Gateway.
- VPC Flow Logs.
- tags obligatorios.
- IAM custom role para Lambda.

Supresiones conscientes:

- `APIG4`: la autorizacion se aplica en Nest con guard JWT global y `@Public()` explicito.
- `IAM5 Resource::*`: Lambda VPC ENI y X-Ray requieren `Resource: *` por limitacion de AWS.
- `RDS10` en development: el stage es destruible para evitar costo permanente; staging y
  production usan retencion y deletion protection.
- `CdkNagValidationFailure` en endpoint SG: CDK no puede resolver estaticamente el CIDR token generado.

Regla:

- toda supresion debe tener razon tecnica concreta.
- no aceptar supresiones genericas como `false positive` sin evidencia.

## 8. CI/CD

El workflow ejecuta `pnpm cdk:synth` cuando cambian:

- `cdk/**`
- `cdk.json`
- `tsconfig.cdk.json`
- `package.json`
- `pnpm-lock.yaml`
- `pnpm-workspace.yaml`

El job sube `cdk.out/` como artifact.

Release artifact tambien ejecuta `pnpm cdk:synth` y empaqueta `cdk.out/` junto a:

- `dist/`
- `drizzle/`
- `docs/openapi/openapi.json`
- SBOM CycloneDX

## 9. Reglas de deploy

Reglas obligatorias:

- usar OIDC, nunca access keys estaticas.
- un rol por environment.
- `production` solo mediante workflow manual desde `main` y GitHub Environment protegido.
- `cdk diff` revisado antes de deploy.
- mismo artefacto promovido entre `development`, `staging` y `production`.
- no modificar recursos manualmente en consola.
- si se toca NAT, Aurora, KMS, IAM, WAF o endpoints privados, pedir review de plataforma/seguridad.

## 10. Gaps restantes

Para llegar a production 10/10 falta:

- conectar Lambda al artefacto real firmado.
- agregar migraciones controladas como step de deploy.
- agregar SNS alarm topics y contactos por stage.
- configurar custom domain y TLS si aplica.
- decidir WAF/CloudFront segun exposicion publica.
- agregar budgets/anomaly detection con CDK o account baseline.
- agregar drift detection programado.
- agregar runbook de rollback de infraestructura.

> Fuente única para **Correcto / Incorrecto: revisión 2026**: [abrir documento canónico](../../../governance/documentation-dry-and-ownership.md).

### ✅ Correcto / ❌ Incorrecto — CDK e IaC AWS - `bus-impl`

✅ **Correcto:** Para **CDK e IaC AWS - `bus-impl`**, limitar roles cloud, medir el coste y utilizar enlaces a las guías AWS propietarias.

❌ **Incorrecto:** En **CDK e IaC AWS - `bus-impl`**, copiar credenciales AWS, inventar precios o meter la configuración cloud dentro del modelo de negocio.
