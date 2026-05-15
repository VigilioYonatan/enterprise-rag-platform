# CI/CD AWS por Stages, Canary y Observabilidad - `bus-impl`

Este documento define como debe operar `bus-impl` en empresas serias: CI rapido y barato, CD con OIDC, ambientes separados, canary antes de production y observabilidad suficiente sin quemar CloudWatch.

## 1. Modelo de ambientes

| Stage | Trigger recomendado | AWS real | DB | Objetivo |
|---|---|---:|---|---|
| `local` | maquina dev | No | PostgreSQL local/Podman | feedback rapido |
| `ci` | PR/push | No para DB | `postgres:17-alpine` service container | calidad barata y deterministica |
| `development` | manual desde `main` | Si | Aurora Serverless v2 bajo costo | validar cloud si se necesita |
| `staging` | push a `main` o manual desde `main` | Si | parecido a prod, menor escala | QA oficial antes de production |
| `production` | manual con approval | Si | prod | trafico real |

Regla clave:

- PR y CI no usan Aurora/RDS real para repositorios; usan PostgreSQL efimero.
- Integraciones AWS locales usan Floci solo cuando cambia S3/SQS/EventBridge/CDK relacionado.
- `development`, `staging` y `production` usan roles AWS distintos.
- `production` nunca se despliega por push directo.
- `develop` y `release/**` no son ramas oficiales; todo artefacto desplegable nace de `main`.

## 2. GitHub Environments

Crear estos environments en GitHub:

```text
development
staging
production
```

Secrets por environment:

```text
AWS_ROLE_ARN        # role IAM asumible por OIDC solo para ese environment
GITHUB_PACKAGES_TOKEN opcional si github.token no tiene read:packages
```

Variables por environment:

```text
AWS_REGION          # ejemplo us-east-1
APP_BASE_URL        # URL real para smoke post deploy
```

Protecciones recomendadas:

| Environment | Review requerido | Comentario |
|---|---:|---|
| `development` | No | manual desde `main` si se necesita cloud barato |
| `staging` | 1 reviewer recomendado | QA oficial antes de production |
| `production` | 2 reviewers + branch/tag protegido | cambio real a clientes |

## 3. OIDC y credenciales

El workflow `.github/workflows/deploy.yml` usa:

- `permissions.id-token: write` solo en el job que asume AWS.
- `aws-actions/configure-aws-credentials`.
- `AWS_ROLE_ARN` desde GitHub Environment, no desde repo global.
- cero access keys estaticas.

Trust policy del role AWS debe limitar:

- organizacion/repo exacto.
- branch o environment.
- audience `sts.amazonaws.com`.
- permisos minimos por stage.

Ejemplo conceptual:

```json
{
  "Condition": {
    "StringEquals": {
      "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
    },
    "StringLike": {
      "token.actions.githubusercontent.com:sub": "repo:ORG/REPO:environment:production"
    }
  }
}
```

## 4. Flujo recomendado

```text
PR hacia main
  -> governance, lint, typecheck, unit, integration con PostgreSQL efimero
  -> contract OpenAPI
  -> security scans
  -> build artifact + SBOM + attestation

merge a main
  -> deploy staging con OIDC
  -> smoke
  -> QA valida con Postman/Scalar en api-staging

manual
  -> deploy development si aplica
  -> smoke + e2e criticos

manual production
  -> approval GitHub Environment
  -> CDK diff
  -> deploy canary 10% por 5 minutos
  -> alarmas CloudWatch/CodeDeploy
  -> rollback automatico si falla canary
```

## 5. Canary y despliegue progresivo

En CDK:

- `development`, `staging`: deployment directo.
- `production`: Lambda alias `live` + AWS CodeDeploy canary 10% por 10 minutos.
- CodeDeploy usa versiones inmutables de Lambda + alias ponderado, equivalente operacional a blue/green para Lambda.
- rollback automatico si las alarmas del alias `live` detectan errores, throttles o duracion P95 sobre SLO.

Esto sigue la practica de Lambda aliases/traffic shifting: API Gateway invoca el alias, no la version `$LATEST`.

## 6. Reusable workflows

Los workflows de deploy de `bus-impl` son wrappers pequenos por stage y consumen el workflow endurecido del mismo commit:

```yaml
uses: ./.github/workflows/secure-deploy-cdk.yml
```

Reglas:

- mantener el workflow de seguridad versionado junto con la aplicacion;
- fijar todas las acciones externas a SHA completo y actualizar mediante Dependabot;
- los secrets siguen viviendo en el repo consumidor o GitHub Environment;
- `bus-impl` despliega el mismo `cdk.out` construido, hasheado y firmado en preflight;
- `vigilio-platform-actions` publica reusable workflows por stack, cinco composite/custom actions
  (`setup-node-pnpm`, `configure-github-packages`, `install-playwright-chromium`,
  `validate-stage-source` y `jira-devops`) y cuatro paquetes compartidos;
- mientras `bus-impl` mantenga workflows locales, esos wrappers son la fuente ejecutada. Los
  nuevos proyectos deben preferir los reusables del hub fijados a SHA completo.

## 7. Observabilidad sin gastar de mas

CloudWatch cuesta por logs, metricas custom, alarmas y consultas. Por eso el baseline debe ser sobrio:

- logs estructurados Pino en JSON.
- retention por stage: corto en `development/staging`, mayor en `production`.
- dashboards con metricas nativas de Lambda y API Gateway.
- alarmas por sintomas: 5XX, throttles, errores Lambda, latencia P95.
- evitar custom metrics de alta cardinalidad como `user_id`, `email`, `request_id`.
- no crear una alarma por endpoint al inicio; usar pocas alarmas de alto valor.
- revisar alarmas ruidosas cada 30 dias.

CDK actual crea:

- dashboard `service-dashboard`.
- alarmas Lambda errors/throttles/duration P95.
- alarmas HTTP API 5XX/latency P95.
- CodeDeploy canary alarm para rollback.

## 7. Cost controls AWS

Reglas:

- `development`: Aurora Serverless v2 min bajo, NAT `0`, logs 14-30 dias.
- `staging`: similar a prod, pero escala menor.
- `production`: deletion protection, retention mayor, alarms estrictas.
- S3: lifecycle, abort multipart uploads, Intelligent-Tiering solo si aplica.
- CloudWatch Logs: retention obligatoria, nunca infinito por defecto.
- NAT Gateway: evitar en lower environments; preferir VPC endpoints.
- Budgets y Cost Anomaly Detection por cuenta/stage.
- tags obligatorios: `app`, `service`, `stage`, `owner`, `cost_center`.

## 8. Que falta para enterprise completo

Ya queda fuerte, pero para produccion real faltaria conectar:

- canal SNS/PagerDuty/Opsgenie/Slack para alarmas.
- canary smoke automatico contra URL del alias/version si se expone por ruta separada.
- migraciones DB controladas antes/despues de deploy con expand/contract.
- AWS Budgets/CDK o cuenta de FinOps central.
- Security Hub/GuardDuty/Config a nivel cuenta, no solo repo.
- synthetic canaries de CloudWatch Synthetics si hay endpoints publicos criticos.

## 9. Referencias oficiales

- GitHub OIDC con AWS: https://docs.github.com/actions/security-for-github-actions/security-hardening-your-deployments/configuring-openid-connect-in-amazon-web-services
- AWS configure-aws-credentials OIDC: https://github.com/aws-actions/configure-aws-credentials
- AWS Lambda weighted aliases/canary: https://docs.aws.amazon.com/lambda/latest/dg/configuring-alias-routing.html
- AWS CodeDeploy deployment configurations: https://docs.aws.amazon.com/codedeploy/latest/userguide/deployment-configurations.html
- CloudWatch recommended alarms: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/Best-Practice-Alarms.html
- CloudWatch cost controls: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/cloudwatch_billing.html

## ✅ Correcto / ❌ Incorrecto: revisión 2026

- ✅ **Correcto:** Instrumentar logs estructurados con correlación OTel, métricas de baja cardinalidad, SLO y privacidad verificable.
- ❌ **Incorrecto:** Loguear tokens/PII/payloads completos, usar ID de usuario como etiqueta Prometheus o declarar trazas sin exportador.
- **Al recibir código existente:** primero caracterizar el comportamiento, después refactorizar en pasos comprobables. [Guía canónica de modernización](../../../standards/engineering/refactoring-existing-code.md).

> **Referencia histórica completa, migrada sin recortes de contenido técnico.** La norma vigente corresponde a `foundations/` y `standards/`; las especializaciones NestJS están en `stacks/backend/nestjs/`. Ante contradicciones, seguir documentación canónica y pruebas del proyecto. Los enlaces relativos se actualizaron para mantener la navegación.

✅ **Correcto:** aplicar la normativa compartida y adaptar estos ejemplos tras comprobar versiones.

❌ **Incorrecto:** copiar ciegamente un fragmento histórico o imponer reglas de NestJS a Laravel.
