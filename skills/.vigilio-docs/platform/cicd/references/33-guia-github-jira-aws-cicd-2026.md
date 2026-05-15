# Guia GitHub, Jira, AWS y CI/CD 2026 - `bus-impl`

Esta guia es el runbook unico para operar el repositorio `bus-impl` con GitHub, Jira, AWS, CI/CD, roles y evidencias.

Objetivo: que cualquier developer, tech lead, security reviewer o DevOps pueda configurar el repo y trabajar sin romper trazabilidad, seguridad ni despliegues.

---

## 1. Modelo operativo y Trunk-Based Development

`bus-impl` opera bajo la metodología **Trunk-Based Development**, la cual estipula:
- **Una sola rama principal (`main`)**: No existen ramas de larga vida como `develop` o `staging` en Git. Todo el historial del código de producción y pruebas vive unificado en `main`.
- **Ramas de corta duración (Feature/Fix)**: Los desarrolladores crean ramas a partir de `main` (ej. `feat/KAN-123/nuevo-modulo`) y las integran rápidamente (en horas o máximo 1-2 días) a través de Pull Requests.
- **Entornos lógicos en AWS (stages)**: `development`, `staging` y `production` son entornos físicos separados en AWS administrados mediante variables y secretos en los **GitHub Environments** correspondientes, alimentándose todos desde `main`.
- **Integración Continua (CI) Rigurosa**: Cada fusión a `main` pasa por un pipeline estricto de compilación, linters (`Biome`), escaneo de secretos (`Gitleaks`), pruebas de seguridad y pruebas de calidad automatizadas.

Tecnologías del modelo:
- **GitHub**: Repositorio central, gobernanza de ramas, revisiones y Environments.
- **Jira**: Trazabilidad del ciclo de vida del software (Jira DevOps).
- **GitHub Actions**: Automatización completa de pipelines de CI/CD.
- **AWS CDK**: Infraestructura como Código (IaC) reproducible por entorno.
- **AWS OIDC**: Autenticación segura y sin credenciales estáticas entre GitHub y AWS.
- **CODEOWNERS**: Revisiones obligatorias automáticas por especialidad técnica.

Regla senior:
- GitHub valida, Jira traza, AWS ejecuta y la automatización de CI/CD deja la evidencia operacional obligatoria.

---

## 2. Roles recomendados y gobernanza multicuenta

| Rol | Responsabilidad | Permisos recomendados |
| --- | --- | --- |
| Developer | Cambios de feature/fix, tests y PR | `Write`, sin bypass |
| Tech Lead | Review tecnico, arquitectura y merge | `Maintain` o reviewer requerido |
| Platform/DevOps | Workflows, CDK, environments y roles AWS | `Maintain`, owner de `.github`, `cdk`, `scripts` |
| Security | Auth, secrets, OIDC, scans, threat model | Reviewer requerido en seguridad |
| Database | Drizzle, migraciones, RDS/PostgreSQL | Reviewer requerido en persistencia |
| QA | Validacion funcional en `staging` | Reviewer en el environment `staging` |
| Release Manager | Produccion, ventana de cambio y rollback | Reviewer requerido en `production` |

CODEOWNERS actual:

```text
* @platform-team

/cdk/ @platform-team @security-team
/.github/ @platform-team @security-team
/scripts/ @platform-team
/src/shared/infrastructure/security/ @security-team
/src/shared/infrastructure/config/ @platform-team @security-team
/src/shared/infrastructure/persistence/ @database-team
/src/**/domain/ @backend-architecture-team
/src/**/application/dtos/ @backend-architecture-team
/src/**/application/schemas/ @backend-architecture-team
/docs/adr/ @backend-architecture-team
/docs/threat-model/ @security-team
```

### A. Configuración de Equipos (GitHub Organization)
Los equipos deben crearse en tu **GitHub Organization** con estructura plana y visibilidad pública. La configuración detallada de estos campos es crítica por razones de seguridad y gobernanza:

* **Parent team (Vacío / Sin herencia)**:
  - *¿Por qué no seleccionar un parent team?* GitHub implementa **herencia bidireccional de permisos**. Si un equipo "hijo" recibe permisos de acceso a un repositorio sensible, el equipo "padre" hereda automáticamente esos mismos accesos. Asimismo, los miembros del equipo "hijo" heredan los accesos que tenga el equipo "padre". Esto rompe el principio de mínimo privilegio y facilita la escalación accidental de permisos. **Mantener estructura plana es obligatorio** para cumplir con estándares DevSecOps corporativos.
* **Team visibility (Visible)**:
  - *Visible (Recomendado)*: Permite que cualquier miembro de la organización vea al equipo y lo mencione en conversaciones (`@Vigilio-Services/platform-team`), discusiones o Pull Requests. Esto es **obligatorio** para que el archivo `CODEOWNERS` pueda resolver las rutas y asignar revisores automáticamente al abrir un Pull Request.
  - *Secret (No recomendado)*: Solo los miembros del propio equipo y los owners de la organización pueden ver al equipo y sus miembros. Los equipos secretos no pueden ser anidados (no pueden tener parent ni child teams). Si un equipo es secreto, los desarrolladores que no pertenezcan a él no podrán mencionarlo en los PR ni se les asignará correctamente en las revisiones si el archivo `CODEOWNERS` no puede mapearlos debido al aislamiento.
* **Team notifications (Enabled)**:
  - Debe estar en **Enabled** para asegurar que todos los miembros del equipo reciban alertas en tiempo real (correo o notificaciones web de GitHub) cuando sean solicitados para revisar un Pull Request o sean mencionados en un ticket.

Configura los siguientes equipos en tu organización:

1. **`platform-team`**:
   - *Descripción*: Responsables del ciclo de vida de la infraestructura cloud en AWS (CDK), diseño y optimización de pipelines de CI/CD (GitHub Actions), gestión de secretos y GitHub Environments, y automatización del cumplimiento y gobierno del repositorio.
2. **`security-team`**:
   - *Descripción*: Responsables de auditoría de código, secretos, vulnerabilidades y políticas criptográficas de la organización.
3. **`database-team`**:
   - *Descripción*: DBA del proyecto. Validan Drizzle ORM, scripts de migración y performance de bases de datos.
4. **`qa-team`**:
   - *Descripción*: Responsables de certificar la calidad de las funcionalidades en el entorno de staging.
5. **`release-managers`**:
   - *Descripción*: Responsables del despliegue final y la aprobación de salidas a producción.
6. **`backend-architecture-team`**:
   - *Descripción*: Tech Leads y Arquitectos de Software encargados del DDD y buenas prácticas de desarrollo NestJS.
7. **`backend-developers`**:
   - *Descripción*: Desarrolladores backend responsables de escribir código de negocio y features en `bus-impl`.
8. **`frontend-architecture-team`**:
   - *Descripción*: Tech Leads y Arquitectos Frontend responsables de la gobernanza de las aplicaciones web y móviles, micro-frontends y estándares de UI.
9. **`frontend-developers`**:
   - *Descripción*: Desarrolladores frontend encargados de las aplicaciones del cliente (`web-mfe` y `mobile-mfe`).

### B. Configuración de Permisos en el Repositorio de GitHub
En **Settings > Collaborators and teams** de tu repositorio `vigilio-bus-impl` (Backend), asigna los siguientes niveles de acceso:
- **`platform-team`**: `Maintain` (les permite actualizar workflows, administrar settings y depurar runners).
- **`backend-developers`**: `Write` (les permite clonar, crear ramas de features y abrir PRs en este repositorio).
- **`frontend-developers` y `frontend-architecture-team`**: Permiso de solo lectura (`Read`) en este repositorio (`bus-impl`). Ellos tendrán permiso `Write` e integración en sus respectivos repositorios (`web-mfe` y `mobile-mfe`).
- **Otros equipos**: Acceso de lectura normal (`Read`) pero con el rol de revisor estricto a través de `CODEOWNERS` cuando aplique.

### C. Aprobaciones de GitHub Environments
Para limitar quién puede activar físicamente los despliegues en la nube de AWS:
1. Ve a **Settings > Environments > production**.
2. Activa **Required reviewers** y asigna al equipo: **`release-managers`**.
3. Ve a **Settings > Environments > staging**.
4. Activa **Required reviewers** y asigna opcionalmente al equipo: **`qa-team`** o **`platform-team`** si deseas control sobre la ventana de QA.

### D. Mapeo en AWS (IAM Identity Center / AWS SSO)
En AWS no debes crear usuarios IAM individuales ni compartir llaves estáticas. Todo acceso humano a
las cuentas de AWS (`development`, `staging`, `production`) se administra centralizadamente:

1. **Conexión de Directorio**: Vincula AWS IAM Identity Center con el IDP de tu empresa (Google Workspace, Azure AD, Okta).
2. **Permission Sets (Conjuntos de permisos)**:
   - **`AdministratorAccess-Set`**: Asignado al equipo **`platform-team`** en todas las cuentas de AWS.
   - **`SecurityAudit-Set`**: Asignado al equipo **`security-team`** para visualización de configuraciones de seguridad.
   - **`Developer-Write-Set`**: Asignado a **`backend-developers`** únicamente sobre la cuenta AWS de `development`. Les permite depurar recursos locales y levantar logs en CloudWatch.
   - **`ReadOnlyAccess-Set`**: Asignado a **`qa-team`** en la cuenta de `staging` para monitorear alarmas.

---

## 3. Configuracion inicial del repositorio GitHub

En `Settings > General`:
- Desactivar `Allow merge commits` si el equipo prefiere historial lineal.
- Activar `Squash merge` o `Rebase merge` según el estándar de desarrollo.
- Activar `Automatically delete head branches` (limpia las ramas de features automáticamente tras el merge).

---

### A. Opciones de Configuración para Proteger la Rama `main`
Puedes blindar la rama `main` utilizando dos opciones en GitHub. **Es mandatorio elegir una de ellas**:

#### Opción 1: Reglas de Protección Clásicas (Settings > Branches)
1. Ve a **Settings > Branches** en tu repositorio.
2. Haz clic en **Add branch protection rule**.
3. En **Branch name pattern**, ingresa: `main`.
4. Configura los siguientes parámetros:
   * **Require a pull request before merging**: Activar.
     * **Required approvals**: `1` o `2`.
     * **Require review from Code Owners**: Activar (obliga la aprobación del equipo dueño de los archivos según `.github/CODEOWNERS`).
   * **Require status checks to pass before merging**: Activar.
     * Selecciona los checks recomendados (ver subsección B).
   * **Require conversation resolution before merging**: Activar (obliga a resolver todos los hilos de comentarios antes del merge).
   * **Block force pushes**: Activar (evita sobreescribir la historia con `git push --force`).
   * **Do not allow bypassing the above settings**: Activar (aplica las reglas incluso a administradores).

#### Opción 2: Conjuntos de Reglas Modernos (Settings > Rulesets)
> [!IMPORTANT]
> **Limitación de Cuenta Gratuita:** Si configuras un Ruleset a nivel de **Organización**, GitHub no lo aplicará en cuentas gratuitas (mostrará una advertencia de *Upgrade*). Para que funcione de forma 100% gratuita, debes configurar el Ruleset a **nivel de repositorio individual** en:
> **Settings > Rulesets > New ruleset > New branch ruleset** (dentro del repositorio `vigilio-bus-impl`).

1. En el repositorio, ve a **Settings > Rulesets**.
2. Selecciona **New ruleset** -> **New branch ruleset**.
3. Configura lo siguiente:
   * **Ruleset Name:** `protect-main`
   * **Enforcement status:** `Active`
   * **Target branches:** Haz clic en *Add target* -> *Include default branch* (o ingresa `main` de forma manual).
   * **Branch rules:**
     * **Restrict deletions**: Activar.
     * **Block force pushes**: Activar.
     * **Require a pull request before merging**: Activar (Required approvals: `1` o `2` + **Require review from Code Owners** activado).
     * **Require status checks to pass**: Activar (agrega los checks recomendados en la subsección B).

---

### B. Status Checks (Jobs del CI) Recomendados
Cuando configuras **Require status checks to pass**, agrega como obligatorio:

- **`Required CI Gate`**

Este job consolida todos los jobs aplicables y mantiene estable el ruleset aunque cambie la matriz
interna o algunos jobs terminen en `skipped` por paths.

#### Todos los Checks Disponibles:
* **`Governance`** (Valida nombres de rama, PR titles, PR body y políticas de package manager)
* **`Quality`** (Biome linter/formatter, Vitest Unit tests y cobertura >85%)
* **`Integration`** (Pruebas contra PostgreSQL real de integración)
* **`Integration AWS Local`** (Pruebas de servicios AWS en local con Floci)
* **`BDD`** (Pruebas Cucumber de comportamiento de negocio)
* **`OpenAPI Contract`** (Detección de breaking changes en el OpenAPI json)
* **`Playwright API E2E`** (Smoke tests de endpoints)
* **`Playwright Browser E2E`** (E2E a nivel de navegador)
* **`Infrastructure CDK`** (cdk synth y análisis de seguridad cdk-nag)
* **`Build Artifact`** (Compilación productiva final)
* **`Secret Scan`** (Escaneo de secretos con Gitleaks)
* **`Deep Security`** (Análisis profundo con CodeQL, Semgrep y Trivy)

Los checks individuales siguen visibles para diagnostico, pero no deben configurarse todos como
required checks independientes. La policy central
`policies/github/main-branch-ruleset.json` define el baseline ejecutable.

---

## 4. Seguridad del repositorio

En `Settings > Code security and analysis` activar:

- Dependabot alerts.
- Dependabot security updates.
- Secret scanning.
- Push protection.
- Code scanning alerts.
- Dependency graph.

Reglas:

- Nunca guardar AWS keys en GitHub secrets si existe OIDC.
- Nunca usar `pull_request_target` para codigo no confiable.
- No usar actions flotantes tipo `@main`, `@master`, `@latest`.
- `actions/checkout` debe usar `persist-credentials: false`.
- `id-token: write` solo en jobs que hacen OIDC o attestations.

El repo lo valida con:

```bash
pnpm governance:github-actions # valida reglas de seguridad de GitHub Actions
```

---

## 5. Convencion Jira, ramas, PRs y commits

La trazabilidad obligatoria es:

```text
Rama:    feat/ABC-123/descripcion-ticket
PR:      [ABC-123] - feat: Descripcion de PR
Commit:  [ABC-123] - feat: descripcion de ticket
```

Tipos permitidos:

```text
feat
fix
hotfix
refactor
docs
test
ci
build
chore
perf
revert
```

Ejemplos validos:

```text
feat/ABC-123/crear-product
[ABC-123] - feat: Crear product
[ABC-123] - feat: crear product
```

Ejemplos invalidos:

```text
feature/crear-product
feat/crear-product
[ABC-123] - Crear product
feat: crear product
[ABC-456] - feat: crear product en rama feat/ABC-123/crear-product
```

Comandos compartidos que lo hacen cumplir:

```text
vigilio-governance validate-branch-name
vigilio-governance validate-pr-title
vigilio-governance validate-pr-body
vigilio-governance validate-pr-risk
vigilio-governance validate-commit-message
vigilio-platform-actions/actions/jira-devops
```

Los validadores vienen de `@vigilioyonatan/devsecops-governance`; no se copian como `.mjs` dentro
del proyecto.

Husky valida local:

```text
.husky/pre-commit   -> lint-staged
.husky/commit-msg   -> validate-commit-message
.husky/pre-push     -> validate-branch-name + prepush:verify
```

CI valida otra vez:

- branch source del PR.
- titulo del PR.
- descripcion real del PR; no se acepta PR vacio, solo template o solo checklist.
- commits del PR.
- existencia del ticket Jira cuando hay credenciales.

La descripcion del PR debe explicar como minimo:

- que cambia.
- por que cambia.
- como se probo.
- riesgo principal y rollback.

---

## 6. Integracion con Jira

Crear secrets en GitHub para poder consultar Jira:

```text
JIRA_BASE_URL       # ejemplo: https://empresa.atlassian.net
JIRA_USER_EMAIL     # usuario tecnico o bot
JIRA_API_TOKEN      # token del usuario tecnico
```

### ¿Dónde obtener estos datos?

1. **`JIRA_BASE_URL`**: Es la dirección web principal (el link) de tu tablero de Jira. Ejemplo: `https://rimac.atlassian.net`. (Ojo: cópialo sin la barra `/` al final).
2. **`JIRA_USER_EMAIL`**: El correo exacto con el que inicias sesión en Jira.
3. **`JIRA_API_TOKEN`**: Para generarlo:
   - Inicia sesión en Jira y ve a [https://id.atlassian.com/manage-profile/security/api-tokens](https://id.atlassian.com/manage-profile/security/api-tokens).
   - Haz clic en **"Create API token"**.
   - Ponle un nombre descriptivo (ej. `github-actions-validator`) y cópialo inmediatamente.

*Nota:* Si estás probando localmente, agrega estas 3 variables a tu archivo `.env`. Si estás en la nube, guárdalas en **Settings > Secrets and variables > Actions** de tu repositorio.

El script consulta:

```text
GET /rest/api/3/issue/{ISSUE_KEY}
```

El PR falla si:

- no hay ticket en la rama o titulo.
- Jira responde 404.
- Jira responde error.
- el ticket esta en estado cerrado como `Done`, `Closed`, `Cancelado` o `Cerrado`.

Buenas practicas:

- Usar un usuario tecnico con permisos minimos de lectura.
- No usar cuenta personal.
- Rotar token cada 90-180 dias.
- Si Jira no esta disponible, no hacer bypass permanente; usar excepcion temporal documentada.

---

## 7. GitHub Environments

Crear estos environments:

```text
development
staging
production
```

Variables por environment:

```text
APP_BASE_URL        # URL publica/API del stage para smoke tests
AWS_REGION          # ejemplo us-east-1
```

Secrets por environment:

```text
AWS_ROLE_ARN        # IAM role asumible por OIDC para ese stage
GITHUB_PACKAGES_TOKEN opcional si se usan paquetes privados
```

Reglas recomendadas:

| Environment | Trigger | Approval | Uso |
| --- | --- | --- | --- |
| `development` | manual desde `main` | opcional | validacion cloud barata si aplica |
| `staging` | automatico/manual desde `main` | 1 reviewer | ensayo preproductivo |
| `production` | manual desde `main` | 2 reviewers, no bypass | trafico real |

Production debe tener:

- Required reviewers.
- No self-review.
- Branch restriction a `main`.
- Secrets solo de produccion.
- No bypass salvo break-glass auditado.

---

## 8. AWS OIDC para GitHub Actions

No usar access keys largas.

### Paso 1: Configurar el Identity Provider (IdP) OIDC en AWS IAM
Si la cuenta AWS aún no tiene registrado el proveedor de confianza de GitHub, realízalo una sola vez por cuenta:
1. Ve a **IAM** -> **Identity providers** -> **Add provider**.
2. Selecciona **OpenID Connect**.
3. Configura:
   - **Provider URL**: `https://token.actions.githubusercontent.com` (haz clic en *Get thumbprint*).
   - **Audience**: `sts.amazonaws.com`
4. Guarda el proveedor. Esto generará el ARN del IdP: `arn:aws:iam::<ACCOUNT_ID>:oidc-provider/token.actions.githubusercontent.com`.

### Paso 2: Crear los Roles IAM correspondientes por cada Environment
Crea un rol independiente por cada entorno lógico en la consola de AWS IAM:
1. Ve a **IAM** -> **Roles** -> **Create role**.
2. Selecciona **Custom trust policy** (o **Web identity** seleccionando el proveedor de GitHub).
3. Pega la **Trust Policy** adaptada a tu repositorio (`Vigilio-Services/vigilio-bus-impl`) y entorno:

#### Para el rol: `bus-impl-development-github-actions-role` (Sandbox)
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::<ACCOUNT_ID>:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
          "token.actions.githubusercontent.com:sub": "repo:Vigilio-Services/vigilio-bus-impl:environment:development"
        }
      }
    }
  ]
}
```

#### Para el rol: `bus-impl-staging-github-actions-role` (QA/Staging)
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::<ACCOUNT_ID>:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
          "token.actions.githubusercontent.com:sub": "repo:Vigilio-Services/vigilio-bus-impl:environment:staging"
        }
      }
    }
  ]
}
```

#### Para el rol: `bus-impl-production-github-actions-role` (Production)
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::<ACCOUNT_ID>:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
          "token.actions.githubusercontent.com:sub": "repo:Vigilio-Services/vigilio-bus-impl:environment:production"
        }
      }
    }
  ]
}
```

### Paso 3: Asignar Permisos a los Roles
1. En la consola de AWS IAM, asigna las políticas de permisos correspondientes a cada rol:
   - **`development`** y **`staging`**: Asigna la política administrada **`AdministratorAccess`** para facilitar el despliegue del stack completo de CDK (redes, bases de datos, lambdas) en entornos de pruebas.
   - **`production`**: Asigna permisos de despliegue mínimos estrictos, restringiendo el uso de servicios no controlados e incluyendo denegaciones explícitas (`Deny`) para `IAM:*` sin scope, `Organizations:*` y `Account:*`.

### Paso 4: Guardar el ARN en GitHub Secrets
1. Copia el ARN del rol creado desde la consola de AWS IAM.
2. En GitHub, ve a **Settings** -> **Environments** -> Selecciona tu environment (ej. `development`).
3. En **Environment secrets**, haz clic en **Add environment secret**:
   - **Name**: `AWS_ROLE_ARN`
   - **Value**: El ARN del rol correspondiente (ej. `arn:aws:iam::<ACCOUNT_ID>:role/bus-impl-development-github-actions-role`).

---

## 9. Workflows reales del repo

El repo usa estos workflows:

```text
.github/workflows/
|-- ci.yml
|-- preview.yml
|-- release-artifact.yml
|-- security-nightly.yml
|-- secure-deploy-cdk.yml
|-- deploy-development.yml
|-- deploy-staging.yml
|-- deploy-production.yml
|-- dora-metrics.yml
|-- governance-audit.yml
`-- jira-release.yml
```

Responsabilidades:

- `ci.yml`: valida PR y push. No despliega.
- `jira-release.yml`: crea/actualiza Fix Version en Jira cuando se publica un tag `v*`.
- `preview.yml`: valida plan de PR sin tocar AWS real.
- `release-artifact.yml`: build, SBOM y attestations.
- `security-nightly.yml`: scans profundos programados.
- `deploy-*.yml`: wrappers pequenos que consumen `.github/workflows/secure-deploy-cdk.yml` para build inmutable, firma KMS, deploy, smoke, DAST y evidencia.
- `deploy-development.yml`: deploy a development.
- `deploy-staging.yml`: deploy a staging.
- `deploy-production.yml`: deploy manual con approval fuerte.
- `dora-metrics.yml`: genera evidencia DORA.
- `governance-audit.yml`: audita rulesets, merge queue y required checks.

---

## 10. Flujo diario de desarrollo

1. Crear rama:

```bash
git checkout main # base de trabajo normal
git pull
git checkout -b feat/ABC-123/crear-product
```

2. Desarrollar y probar local:

```bash
pnpm lint # valida formato y lint con Biome CI
pnpm typecheck # valida tipos app + CDK
pnpm test # ejecuta unit tests rapidos
pnpm test:coverage # ejecuta unit tests con coverage local
```

3. Commit:

```bash
git add .
git commit -m "[ABC-123] - feat: crear product"
```

4. Push:

```bash
git push -u origin feat/ABC-123/crear-product
```

5. Crear PR hacia `main`:

```text
[ABC-123] - feat: Crear product
```

6. Esperar CI verde.

7. Resolver comentarios.

8. Merge cuando reviewers y checks esten completos.

---

## 11. Flujo de CI en Pull Request

`ci.yml` ejecuta:

1. `changes`: detecta archivos modificados y decide que jobs corren.
2. `governance`: branch, PR title, commits, Jira, package manager, GitHub Actions policy y dependency review.
3. `quality`: Biome, typecheck, coverage y Drizzle check cuando aplica.
4. `integration`: PostgreSQL real en servicio efimero.
5. `integration-aws`: Floci para S3/SQS/EventBridge/Lambda local cuando aplica.
6. `bdd`: Cucumber.
7. `contract`: OpenAPI export/diff.
8. `e2e`: Playwright API contra app real.
9. `e2e-browser`: navegador solo cuando aplica.
10. `infrastructure`: CDK synth.
11. `build`: build, SBOM y attestations.
12. `secret-scan`: Gitleaks.
13. `security-deep`: CodeQL, Semgrep y Trivy cuando aplica.

Regla:

- PR no mergea si governance falla.
- PR no mergea si cambia contrato OpenAPI con breaking change no aprobado.
- PR no mergea si falla security relevante.

---

## 12. Deploy por ambiente

Development:

```text
manual desde main -> deploy-development.yml -> environment development
```

Staging / QA:

```text
push a main o manual -> deploy-staging.yml -> environment staging
```

QA prueba aqui con Postman/Scalar. Si falla, se corrige con otro PR hacia `main`. Production no avanza hasta aprobacion QA.

Production:

```text
manual desde main -> approvals -> deploy-production.yml -> environment production
```

Cada deploy hace:

1. install reproducible con `pnpm install --frozen-lockfile --prefer-offline`.
2. governance.
3. lint.
4. typecheck.
5. coverage.
6. OpenAPI export/diff.
7. CDK synth.
8. build.
9. SBOM.
10. artifact digests.
11. AWS OIDC.
12. CDK diff guardado.
13. CDK deploy si `deploy_mode=apply`.
14. rollback target.
15. smoke endpoints.
16. evidencia operacional.
17. registro de deployment en Jira si hay tickets detectados.
18. transicion Jira segun environment cuando aplica.
19. incidente Jira automatico si falla deploy productivo.

---

## 13. Evidencia operacional

Cada deploy debe producir:

```text
reports/artifact-digests-<stage>.txt
reports/sbom-<stage>.cdx.json
reports/cdk-diff-<stage>.txt
reports/smoke-<stage>.txt
reports/rollback-target-<stage>.json
reports/operational-evidence-preflight-<stage>.json
reports/operational-evidence-deploy-<stage>.json
reports/operational-evidence-smoke-<stage>.json
```

Comando local:

```bash
pnpm evidence:operational # genera evidencia operacional local con variables disponibles
```

Regla:

- Si no hay evidencia, no es production-ready.

---

## 14. AWS y CDK

### A. Despliegue Automatizado de Infraestructura (Base de Datos y Redes)
No es necesario que crees las bases de datos ni las VPCs manualmente en la consola de AWS. El código de **AWS CDK** ubicado en el directorio `/cdk/` se encarga de aprovisionar toda la infraestructura de forma automática e idéntica en cada cuenta:
- **`BusImplNetworkStack`**: Crea la VPC, subredes públicas y privadas, y los VPC Endpoints necesarios.
- **`BusImplDatabaseStack`**: Crea la base de datos relacional **Amazon Aurora Serverless v2 (PostgreSQL)**, configura su grupo de seguridad, las credenciales maestras y las políticas de retención y borrado correspondientes según el stage.
- **`BusImplApiStack`**: Crea la función Lambda de NestJS, el HTTP API Gateway de entrada y las reglas de ruteo y permisos.

Cuando el pipeline de CI/CD se ejecuta en el environment correspondiente, CDK detecta la cuenta AWS activa (mediante OIDC) y despliega o actualiza estos recursos de forma aislada.

### B. Configuración de Acceso Local para Desarrolladores (AWS SSO CLI)
Si un desarrollador necesita ejecutar comandos de CDK desde su laptop (ej: para comparar cambios o depurar localmente contra la nube):
1. El desarrollador debe iniciar sesión en el portal SSO de AWS desde su terminal:
   ```bash
   aws sso login --profile rimac-development
   ```
2. Exportar el perfil activo:
   ```bash
   export AWS_PROFILE=rimac-development
   ```
3. Ejecutar los comandos de CDK locales:
   ```bash
   pnpm cdk:synth # sintetiza CloudFormation y valida CDK
   pnpm cdk:diff:development # muestra diferencias locales contra la cuenta de AWS Dev
   ```

### C. Comandos Principales de CDK en el Proyecto
- `pnpm cdk:synth`: Sintetiza las plantillas de CloudFormation localmente y valida cumplimiento de seguridad (`cdk-nag`).
- `pnpm cdk:diff:development` / `staging` / `production`: Compara tu código local contra el estado desplegado en AWS.
- `pnpm cdk:deploy:development` / `staging`: Despliegue manual local (solo permitido para administradores/plataforma en emergencias).
- `pnpm cdk:deploy:production`: Despliegue manual en producción (bloqueado por políticas IAM y altamente desaconsejado; usar siempre GitHub Actions).

Reglas de CDK:
- **No compartir bases de datos**: Cada cuenta tiene su propio clúster Aurora físicamente aislado.
- **Evitar drift manual**: Todo cambio de infraestructura debe ser mediante código CDK en Git, jamás editado manualmente en la consola de AWS.

---

## 15. Secrets y variables por entorno (SSM / Secrets Manager)

### A. Configuración de Variables en AWS (SSM Parameter Store)
El backend de `bus-impl` lee sus variables de configuración en tiempo de ejecución desde el **SSM Parameter Store** de AWS. Las variables deben crearse en cada cuenta de AWS usando la ruta jerárquica `/bus-impl/<stage>/VARIABLE_NAME`.

#### Ejemplo de parámetros requeridos a configurar en cada cuenta AWS:
- `/bus-impl/development/PORT` -> `3000` (String)
- `/bus-impl/development/JWT_SECRET` -> Secreto de JWT largo y seguro (SecureString)
- `/bus-impl/development/BEDROCK_MODEL_ID` -> `anthropic.claude-3-haiku-20240307-v1:0` (String)

#### ¿Cómo crearlos rápido en AWS usando la CLI?
Un desarrollador con privilegios puede crearlos desde su terminal:
```bash
aws ssm put-parameter --name "/bus-impl/development/PORT" --value "3000" --type "String" --overwrite
aws ssm put-parameter --name "/bus-impl/development/JWT_SECRET" --value "tu-secreto-seguro" --type "SecureString" --overwrite
```

### B. Secrets Manager para Datos Altamente Sensibles
Para credenciales maestras de bases de datos o llaves de APIs de terceros (como integraciones externas):
- CDK crea automáticamente un secreto en **AWS Secrets Manager** para la contraseña de la base de datos Aurora.
- El backend lee este secreto en runtime resolviendo el ARN del secreto inyectado por CDK.

### C. Variables en Local (.env)
Para el desarrollo local en tu computadora, la aplicación lee del archivo local `.env` (el cual está en `.gitignore` y nunca debe ser subido al repositorio Git).
- Usa `.env.example` como plantilla para configurar tu `.env` local.
- Para simular la nube localmente, el `.env` apunta a contenedores Docker locales (PostgreSQL local y LocalStack/Floci para simular S3).

### D. Resumen de Variables en GitHub
Para el funcionamiento correcto de los pipelines, configura los siguientes secretos y variables en el repositorio:

#### GitHub Repository Secrets (Configuración general):
- `JIRA_BASE_URL`: URL de tu portal Atlassian Jira (ej: `https://rimac.atlassian.net`).
- `JIRA_USER_EMAIL`: Correo electrónico del usuario bot/técnico de Jira.
- `JIRA_API_TOKEN`: Token de API REST generado para el bot de Jira.

#### GitHub Environment Secrets (Específicos por entorno/stage):
- `AWS_ROLE_ARN`: El ARN del rol OIDC a asumir en la cuenta AWS destino (ej. `arn:aws:iam::309191981509:role/bus-impl-development-github-actions-role`).

#### GitHub Environment Variables (Variables de entorno no secretas):
- `APP_BASE_URL`: La URL pública de tu API Gateway en ese stage para ejecutar las pruebas post-despliegue (Smoke Tests).
- `AWS_REGION`: La región de AWS del despliegue (ej. `us-east-1`).

#### GitHub Repository Variables (Para automatización de Jira DevOps):
- `JIRA_PROJECT_KEY`: Clave del proyecto en Jira (ej. `KAN`).
- `JIRA_DEPLOYMENTS_API_ENABLED`: `true` si el workspace soporta la API oficial de Atlassian Deployments.
- `JIRA_TRANSITION_CODE_REVIEW`: Transición en Jira al abrir un PR (ej: `En revisión`).
- `JIRA_TRANSITION_STAGING`: Transición al desplegar en staging (ej: `QA`).
- `JIRA_TRANSITION_PRODUCTION`: Transición al desplegar en producción (ej: `Finalizado` o `Done`).

Reglas críticas de Seguridad:
- **Jamás commitear secretos**: Nunca guardes contraseñas, tokens de API o JWT_SECRET en archivos de texto plano dentro de Git.
- **Logs Limpios**: La configuración de NestJS y Pino Logger tiene prohibido imprimir variables marcadas como confidenciales o del Secrets Manager en la salida estándar de CloudWatch.

---

## 16. `.npmrc` del proyecto y configuracion de registry

El repo incluye un `.npmrc` commiteado con configuracion segura. Este archivo no contiene tokens reales.

Contenido actual:

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
verify-store-dir=.npm-store
@vigilio-services:registry=https://npm.pkg.github.com
@vigilioyonatan:registry=https://npm.pkg.github.com
always-auth=true
```

Lectura de cada linea:

| Directiva | Proposito |
| --- | --- |
| `engine-strict=true` | Falla si Node/pnpm no cumple `engines` de `package.json` |
| `fund=false` | Suprime mensajes de funding al instalar |
| `audit=true` | Ejecuta audit automatico en cada install |
| `save-exact=true` | Guarda versiones exactas sin `^` ni `~` |
| `package-manager-strict=true` | Obliga a usar el package manager declarado en `packageManager` |
| `strict-peer-dependencies=true` | Falla si hay conflictos de peer dependencies |
| `auto-install-peers=false` | No instala peers automaticamente, deben ser explicitos |
| `prefer-frozen-lockfile=true` | Prioriza usar el lockfile tal cual esta |
| `verify-store-integrity=true` | Verifica integridad del store de pnpm |
| `verify-store-dir=.npm-store` | Usa el directorio local definido para verificar el store |
| `@vigilio-services:registry=https://npm.pkg.github.com` | Redirige scope `@vigilio-services` a GitHub Packages |
| `@vigilioyonatan:registry=https://npm.pkg.github.com` | Redirige packages de plataforma Vigilio a GitHub Packages |
| `always-auth=true` | Requiere autenticacion para todas las operaciones de registry |

Reglas:

- Este `.npmrc` se commitea porque no tiene tokens.
- No agregar `//npm.pkg.github.com/:_authToken=ghp_xxxx` al archivo del repo.
- Tokens reales van en `~/.npmrc` del desarrollador o en variables de entorno de CI.
- Si el registry interno usa CA privada, documentar `cafile` en el `.npmrc` del desarrollador, nunca en el del repo.

---

## 17. Como obtener y configurar el token de GitHub Packages

### Paso 1: crear un Personal Access Token (classic) o Fine-Grained Token

Ir a GitHub → Settings → Developer settings → Personal access tokens.

Para PAT classic:

- Seleccionar scope `read:packages`.
- Si el equipo publica paquetes, agregar `write:packages`.
- Definir expiracion maxima de 90 dias.

Para Fine-Grained Token (recomendado 2026):

- Seleccionar la organizacion correcta.
- Repository access: `Only select repositories` o `All repositories` segun necesidad.
- Permissions: `Packages` → `Read`.
- Definir expiracion maxima de 90 dias.
- Fine-Grained Tokens son preferibles porque tienen scope mas reducido.

### Paso 2: configurar `~/.npmrc` del desarrollador

En la maquina local del developer, agregar al `~/.npmrc` global (no al del proyecto):

```ini
//npm.pkg.github.com/:_authToken=${GITHUB_PACKAGES_TOKEN}
```

Forma segura con variable de entorno (preferida):

```bash
# Inyectar GITHUB_PACKAGES_TOKEN desde el gestor de credenciales del sistema.
: "${GITHUB_PACKAGES_TOKEN:?GITHUB_PACKAGES_TOKEN no configurado}"
```

Y en `~/.npmrc`:

```ini
//npm.pkg.github.com/:_authToken=${GITHUB_PACKAGES_TOKEN}
```

### Paso 3: verificar

```bash
pnpm install   # resuelve @<organization>/* desde GitHub Packages
```

Si falla con `401 Unauthorized` o `403 Forbidden`:

- Verificar que el token tiene scope `read:packages`.
- Verificar que el token no esta expirado.
- Verificar que el usuario tiene acceso a la organizacion.
- Verificar que el `.npmrc` del proyecto apunta a `https://npm.pkg.github.com` para
  `@vigilio-services` y `@vigilioyonatan`.

### Rotacion

- Rotar el token cada 90 dias maximo.
- GitHub permite crear un token nuevo antes de revocar el anterior para evitar downtime.
- Documentar en el equipo la fecha de proxima rotacion.

---

## 18. Credenciales de GitHub Packages en GitHub Actions

En los workflows de CI/CD, el token se inyecta dinamicamente en cada job que necesita instalar dependencias.

### Como lo hace el repo actualmente

Cada job que corre `pnpm install` tiene este step:

```yaml
- name: Configure GitHub Packages auth
  shell: bash
  run: |
    printf "//npm.pkg.github.com/:_authToken=%s\n" "${GITHUB_PACKAGES_TOKEN}" >> ~/.npmrc
  env:
    GITHUB_PACKAGES_TOKEN: ${{ secrets.GITHUB_PACKAGES_TOKEN || github.token }}
```

Lectura:

- Escribe el token en `~/.npmrc` del runner (no en el del repo).
- Usa `printf` en lugar de `echo` para evitar historial de shell con el token.
- `>>` agrega la linea al `.npmrc` existente del usuario runner.
- Fallback: si no existe `GITHUB_PACKAGES_TOKEN`, usa `github.token` (automatico, con permisos definidos en `permissions`).

### Configurar el secret

Opcion A: secret de repositorio (recomendada si se usan paquetes de otra organizacion):

1. Ir a Settings → Secrets and variables → Actions → New repository secret.
2. Name: `GITHUB_PACKAGES_TOKEN`.
3. Value: un PAT con `read:packages` de un usuario tecnico/bot.

Opcion B: usar `github.token` (sin secret adicional):

- Funciona si los paquetes `@vigilio-services` estan en la misma organizacion.
- Requiere `permissions.packages: read` en el workflow.
- No requiere crear ningun secret manual.
- El repo ya soporta esto con el fallback `${{ secrets.GITHUB_PACKAGES_TOKEN || github.token }}`.

### Permisos del workflow

```yaml
permissions:
  contents: read
  packages: read   # necesario para que github.token pueda leer GitHub Packages
```

Para jobs de deploy con OIDC:

```yaml
permissions:
  contents: read
  id-token: write   # necesario para OIDC con AWS
  packages: read    # necesario para GitHub Packages
```

### Errores comunes

| Error | Causa | Solucion |
| --- | --- | --- |
| `401 Unauthorized` en install | Token invalido o expirado | Rotar `GITHUB_PACKAGES_TOKEN` |
| `403 Forbidden` | Token sin scope `read:packages` | Regenerar token con scope correcto |
| `404 Not Found` | Scope `@vigilio-services` no apunta a GitHub Packages | Verificar `.npmrc` tiene `@vigilio-services:registry=https://npm.pkg.github.com` |
| `ENOACCESS` | `github.token` sin `packages: read` | Agregar `permissions.packages: read` al job |
| Install funciona en CI pero no local | Falta `~/.npmrc` local con token | Configurar segun seccion 17 |

---

## 19. AWS tokens, OIDC y buenas practicas de credenciales

### Principio base: no access keys estaticas

Este proyecto usa OIDC (OpenID Connect) entre GitHub Actions y AWS. No se usan `AWS_ACCESS_KEY_ID` ni `AWS_SECRET_ACCESS_KEY` en CI/CD.

Excepciones:

- `.env` local usa credenciales de prueba (`test`/`test`) para Floci y LocalStack.
- Si un developer necesita acceso a una cuenta AWS real desde su laptop, debe usar AWS SSO/Identity Center, no access keys permanentes.

### Como funciona OIDC en este repo

```text
GitHub Actions                          AWS
    |                                    |
    |--- solicita OIDC token --->        |
    |    (claims: repo, branch,          |
    |     environment, workflow)         |
    |                                    |
    |--- AssumeRoleWithWebIdentity -->   |
    |    (role: bus-impl-<stage>-        |
    |     github-actions-role)           |
    |                                    |
    |<-- credenciales temporales ----    |
    |    (expiran en 1h por defecto)     |
    |                                    |
    |--- CDK deploy, AWS CLI, etc -->    |
```

El step en el workflow:

```yaml
- name: Configure AWS credentials with OIDC
  uses: aws-actions/configure-aws-credentials@v6
  with:
    aws-region: ${{ vars.AWS_REGION || env.AWS_REGION }}
    role-session-name: bus-impl-${{ inputs.stage }}-${{ github.run_id }}
    role-to-assume: ${{ secrets.AWS_ROLE_ARN }}
```

Lectura:

- `role-to-assume` viene del secret del environment (`AWS_ROLE_ARN`).
- `role-session-name` incluye stage y run ID para auditoria en CloudTrail.
- No hay access keys. La accion usa OIDC internamente.
- `id-token: write` debe estar en los `permissions` del job.

### Trust policy por environment

Cada IAM role debe tener trust policy restrictiva:

Para `production` (mas estricta):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::ACCOUNT_ID:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
          "token.actions.githubusercontent.com:sub": "repo:ORG/bus-impl:environment:production"
        }
      }
    }
  ]
}
```

Para `development` (puede ser ligeramente mas flexible):

```json
{
  "Condition": {
    "StringEquals": {
      "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
    },
    "StringLike": {
      "token.actions.githubusercontent.com:sub": "repo:ORG/bus-impl:environment:development"
    }
  }
}
```

Reglas de trust policy:

| Regla | Justificacion |
| --- | --- |
| No usar `repo:ORG/bus-impl:*` en production | Un PR abierto o branch random podria asumir el role |
| Usar `StringEquals` para production, no `StringLike` | Evita wildcards accidentales |
| Un role por environment | Aislamiento de blast radius |
| Session name con run ID | Trazabilidad en CloudTrail |
| Duracion maxima de sesion: 1 hora | Minimo tiempo necesario para CDK deploy |

### IAM policies por environment

Principio de minimo privilegio:

```text
development:
  - CloudFormation, Lambda, API Gateway, S3, SQS, EventBridge, RDS
  - Permiso amplio en la cuenta de desarrollo
  - Cost controls activos

test:
  - Igual que development pero en cuenta separada

staging:
  - Permisos similares a production
  - Mismos servicios, mismos limites

production:
  - Solo lo que CDK necesita para desplegar
  - Deny explicito en: IAM:*, Organizations:*, Account:*
  - No admin global
  - Alertas de billing
```

### Credenciales AWS en entorno local

Para desarrollo local, el `.env` usa:

```text
AWS_ACCESS_KEY_ID=test
AWS_SECRET_ACCESS_KEY=test
AWS_REGION=us-east-1
```

Estas son credenciales falsas para Floci/LocalStack. No conectan a AWS real.

Si un developer necesita probar contra AWS real:

1. Usar AWS SSO/Identity Center:

```bash
aws sso login --profile rimac-dev
export AWS_PROFILE=rimac-dev
```

2. Nunca guardar access keys reales en `.env`.
3. Nunca commitear access keys reales.
4. Si se necesitan access keys temporales, usar `aws sts get-session-token` o `aws sts assume-role`.

### Token lifecycle y rotacion

| Token | Donde vive | Rotacion | Responsable |
| --- | --- | --- | --- |
| `GITHUB_PACKAGES_TOKEN` | GitHub Secrets (repo) | Cada 90 dias | Platform/DevOps |
| `github.token` | Automatico GitHub | Cada ejecucion (efimero) | GitHub |
| `AWS_ROLE_ARN` (OIDC) | GitHub Environment Secrets | No rota (es un ARN, no un secret) | Platform/DevOps |
| Credenciales AWS OIDC | Temporal en runner | Cada ejecucion (1h max) | AWS STS |
| `JIRA_API_TOKEN` | GitHub Secrets (repo) | Cada 90-180 dias | Platform/DevOps |
| PAT local de developer | `~/.npmrc` del developer | Cada 90 dias | Cada developer |
| AWS SSO session | AWS SSO cache local | Cada 8-12 horas | Cada developer |

Checklist de rotacion trimestral:

- [ ] Rotar `GITHUB_PACKAGES_TOKEN` si no se usa `github.token`.
- [ ] Rotar `JIRA_API_TOKEN`.
- [ ] Verificar que PATs de developers no esten expirados.
- [ ] Revisar AWS IAM Access Analyzer para permisos no usados.
- [ ] Revisar CloudTrail para sesiones OIDC anomalas.
- [ ] Verificar que trust policies no se hayan ampliado sin aprobacion.

---

## 20. Release production

Checklist antes de production:

- PR mergeado a `main`.
- CI verde.
- Security sin HIGH/CRITICAL no aceptado.
- OpenAPI sin breaking changes no aprobados.
- CDK diff revisado.
- Artifact/SBOM/attestation generado.
- GitHub Environment `production` pide reviewers.
- Jira en estado correcto.
- Rollback target definido.
- Smoke post-deploy habilitado.
- Dashboard y alarmas revisadas.

Deploy:

1. Ir a `Actions`.
2. Ejecutar `bus-impl-deploy-production`.
3. Seleccionar:

```text
deploy_mode=plan # para revisar
run_smoke=true
```

4. Revisar CDK diff.
5. Ejecutar otra vez con:

```text
deploy_mode=apply
run_smoke=true
```

6. Aprobar environment `production`.
7. Verificar smoke.
8. Descargar artifacts de evidencia.
9. Actualizar Jira/release notes.

---

## 21. Rollback

Rollback rapido:

- redeploy del ultimo artifact bueno.
- revert commit y redeploy.
- CDK rollback si la falla es infraestructura.
- restaurar DB solo si hay incidente de datos y runbook aprobado.

Antes de rollback:

- identificar commit actual.
- identificar rollback target.
- revisar `reports/rollback-target-<stage>.json`.
- avisar a owners.
- preservar logs/evidencia.

Despues de rollback:

- ejecutar smoke.
- revisar alarmas.
- abrir incidente o postmortem si afecto usuarios.
- actualizar Jira.

---

## 22. Checklist de setup inicial

GitHub:

- [ ] Crear teams: platform, security, database, backend architecture, QA/release.
- [ ] Validar `.github/CODEOWNERS`.
- [ ] Configurar branch protection en `main`.
- [ ] Activar required status checks.
- [ ] Activar Code Owners review.
- [ ] Activar Secret Scanning y Push Protection.
- [ ] Activar Dependabot alerts.
- [ ] Crear GitHub Environments.

Jira:

- [ ] Crear usuario tecnico.
- [ ] Crear token.
- [ ] Configurar `JIRA_BASE_URL`, `JIRA_USER_EMAIL`, `JIRA_API_TOKEN`.
- [ ] Validar que los tickets sean visibles por API.

AWS:

- [ ] Crear OIDC provider.
- [ ] Crear IAM role por environment.
- [ ] Configurar trust policy por environment.
- [ ] Configurar minimo privilegio.
- [ ] Guardar `AWS_ROLE_ARN` en cada environment.
- [ ] Configurar `APP_BASE_URL` por environment.
- [ ] Validar CDK synth/diff.

CI/CD:

- [ ] `pnpm governance:github-actions` pasa.
- [ ] `pnpm lint` pasa.
- [ ] `pnpm typecheck` pasa.
- [ ] `pnpm test:coverage:ci` pasa.
- [ ] `pnpm openapi:export` pasa.
- [ ] `pnpm cdk:synth` pasa.
- [ ] `pnpm smoke:endpoints` funciona contra cada stage desplegado.

---

## 23. Errores comunes

Error: PR title sin tipo.

```text
Mal:  [ABC-123] - Crear product
Bien: [ABC-123] - feat: Crear product
```

Error: commit sin ticket.

```text
Mal:  feat: crear product
Bien: [ABC-123] - feat: crear product
```

Error: ticket distinto entre rama y PR.

```text
Rama: feat/ABC-123/crear-product
PR:   [ABC-456] - feat: Crear product
```

Debe ser:

```text
Rama: feat/ABC-123/crear-product
PR:   [ABC-123] - feat: Crear product
```

Error: deploy production sin approval.

- Configurar GitHub Environment `production` con reviewers obligatorios.

Error: AWS deploy con access keys.

- Reemplazar por OIDC y `AWS_ROLE_ARN`.

Error: Jira no mueve el ticket aunque el PR paso.

- Revisar que el ticket existe y el bot tiene permiso `Browse projects`.
- Revisar que `JIRA_TRANSITION_CODE_REVIEW` y las variables por stage coinciden exactamente con transiciones disponibles en el workflow de Jira.
- Revisar que `JIRA_BASE_URL`, `JIRA_USER_EMAIL` y `JIRA_API_TOKEN` estan configurados.
- Si una variable de transicion no esta configurada, el deployment se registra/commenta pero no fuerza una transicion inventada.

---

## 24. Referencias internas

- [DevSecOps](4-devsecops.md)
- [Ambientes de trabajo](3-ambientes-trabajo.md)
- [Evidencia operacional](../../sre/references/19-evidencia-operacional.md)
- [CDK e IaC AWS](../../iac/references/25-cdk-iac-aws.md)
- [CI/CD AWS stages y observabilidad](28-cicd-aws-stages-observability.md)
- [Configuracion NestJS con Zod y AWS](../../../stacks/backend/nestjs/runtime/references/29-config-nest-zod-aws.md)
- [Backup, restore y DR](../../../standards/data/references/17-backup-restore-dr.md)
- [Observability y SLO](../../../standards/observability/references/16-observability-slo.md)

---

## 25. Dependabot y repository policy

El repositorio incluye `.github/dependabot.yml` para abrir PRs semanales de dependencias npm/pnpm y GitHub Actions.

Si el proyecto instala paquetes privados desde GitHub Packages, crear el secret:

```text
DEPENDABOT_GITHUB_PACKAGES_TOKEN
```

Permiso minimo del token: `read:packages`.

El job `governance` ejecuta:

```bash
pnpm governance:repository # valida CODEOWNERS, PR template, Dependabot y PR body gate
```

Este control evita que alguien elimine archivos criticos de gobierno del repo sin romper CI.

---

## 26. Automatizacion Jira DevOps 2026

El proyecto usa `Vigilio-Services/vigilio-platform-actions/actions/jira-devops` fijada a SHA completo para centralizar la integracion Jira sin duplicar scripts por repositorio.

Practicas implementadas:

- PR linting: rama, titulo, descripcion y commits deben tener ticket Jira.
- Validacion de existencia: CI consulta `GET /rest/api/3/issue/{ISSUE_KEY}` si hay credenciales.
- Transicion de PR: al abrir/actualizar PR se intenta mover el ticket a `Code Review`.
- Deployment tracking: cada deploy `apply` detecta tickets en commits y registra/commenta el deployment en Jira.
- QA/Staging: `staging` mueve tickets a `QA` o a la transicion configurada.
- Production: mueve tickets a `Done` o a la transicion configurada.
- Fix Versions: al crear un tag `v*`, `jira-release.yml` crea/actualiza la version y asigna los tickets detectados.
- Incident response: si falla un deploy productivo, se crea un Bug P1 en Jira.
- Smart commits: soportado por accion central, recomendado solo como ayuda, no como control principal.
- Feature flags: soportado como comentario/transicion cuando el rollout llega a 100%; integrarlo con LaunchDarkly, AWS AppConfig o la plataforma interna si existe.

Modo oficial vs fallback:

- `JIRA_DEPLOYMENTS_API_ENABLED=true` usa Jira Software Deployments API (`/rest/deployments/0.1/bulk`) cuando la instancia Atlassian lo permite.
- Si la API oficial no esta habilitada, se usa fallback seguro con comentarios y transiciones REST v3.
- El fallback es intencional: muchas empresas no tienen la integracion Atlassian DevOps completa activada, pero si tienen Jira REST v3.

Variables recomendadas:

```text
JIRA_PROJECT_KEY=ABC
JIRA_DEPLOYMENTS_API_ENABLED=false
JIRA_TRANSITION_CODE_REVIEW=En revision
JIRA_TRANSITION_STAGING=QA
JIRA_TRANSITION_PRODUCTION=Finalizado
```

Secrets requeridos para mutar Jira:

```text
JIRA_BASE_URL=https://empresa.atlassian.net
JIRA_USER_EMAIL=github-actions-bot@empresa.com
JIRA_API_TOKEN=token_del_bot
```

Permisos minimos del bot Jira:

- Ver issues del proyecto.
- Agregar comentarios.
- Ejecutar transiciones del workflow.
- Crear versiones del proyecto.
- Editar `Fix Version`.
- Crear issues tipo Bug para incidentes.

Flujo recomendado QA:

```text
feature branch -> PR -> CI verde -> merge a main -> staging automatico -> QA prueba URL staging -> approval release -> production
```

Regla brutalmente honesta:

- No pruebes production con fe.
- No crees 50 ambientes por PR si el costo no lo justifica.
- Usa un staging permanente barato, controlado y con datos de prueba.
- Production solo avanza por environment protegido y con rollback documentado.

---

## 27. Guía Práctica de Ramas, PRs y Prevención de Conflictos (DevSecOps 2026)

Esta sección define el estándar del equipo para trabajar con ramas Git y Jira sin bloquear a otros desarrolladores ni romper la estabilidad del código base en `main`.

### 27.1 Escenario A: Trabajo en Ramas Independientes (Caso Habitual)
Si vas a iniciar una tarea que **no depende** del código incompleto que tienes en tu rama actual, debes limpiar tu espacio de trabajo y crear tu rama desde la base común (`main`).

#### Flujo de trabajo práctico:
1. **Guarda el trabajo en progreso (WIP)** en tu rama actual:
   ```bash
   git add .
   # Usa un commit temporal con la etiqueta [WIP] (Work In Progress)
   git commit -m "[KAN-123] - chore(auth): [WIP] guardar cambios parciales"
   ```
   > [!TIP]
   > Preferimos hacer un commit temporal en Git en lugar de usar `git stash`. Un commit te permite hacer `git push` a tu rama remota para tener un respaldo en la nube y evita que pierdas cambios accidentalmente por un comando de limpieza de stash.
2. **Regresa a `main` y actualízalo**:
   ```bash
   git checkout main
   git pull origin main
   ```
3. **Crea la nueva rama independiente**:
   ```bash
   git checkout -b feat(catalogo): [KAN-124] - implementar indexacion de productos
   ```
   *(Nota: Recuerda el formato obligatorio con scope para tus nuevos commits).*

---

### 27.2 Escenario B: Ramas Encadenadas (Stacked Branches)
Si la nueva Tarea B **depende directamente** del código que estás escribiendo en la Tarea A (por ejemplo: la Tarea A crea el esquema de la base de datos y la Tarea B desarrolla el endpoint que la consulta).

#### Flujo de trabajo práctico:
1. **Haz commit de todos tus cambios** en la Rama A (`feat/KAN-A/...`).
2. **Crea la Rama B partiendo directamente desde la Rama A** (sin pasar por `main`):
   ```bash
   git checkout feat/KAN-A/...
   git checkout -b feat/KAN-B/...
   ```
3. **Configura el Pull Request de forma limpia en GitHub (Stacked PRs)**:
   * Al crear el PR para la Rama B, **cambia la base de comparación** en GitHub:
     * **Base**: `feat/KAN-A/...` (en lugar de `main`)
     * **Compare**: `feat/KAN-B/...`
   > [!IMPORTANT]
   > Si apuntas la base del PR B a la Rama A, GitHub ocultará los cambios de la base de datos (Rama A) y solo mostrará el código nuevo del endpoint (Rama B). Esto permite revisiones de código enfocadas y limpias.
4. **Fusión en Cascada**:
   * Cuando la Rama A pase la CI y sea integrada a `main`, GitHub actualizará de forma automática la base de tu PR B para que apunte a `main`.

---

### 27.3 Prevención y Resolución de Conflictos de Merge

Los conflictos ocurren cuando varios desarrolladores modifican las mismas líneas de código. Para evitar que un conflicto rompa la build o silencie errores:

#### A. Prácticas Preventivas Diarias:
* **Integración Incremental Local**: Integra los cambios de `main` a tu rama de feature al menos una vez al día:
  ```bash
  git merge origin/main
  ```
  *(Resolver conflictos de 5 líneas una vez al día es infinitamente más seguro que resolver un conflicto de 300 líneas el día del release).*
* **Sincronización antes de subir**: Antes de ejecutar el push final, realiza siempre una sincronización con `main` y corre las pruebas locales:
  ```bash
  git merge origin/main
  pnpm prepush:verify
  ```

#### B. Resolución Segura de Conflictos:
1. **Analiza el conflicto en tu editor**:
   * Revisa de forma detallada los marcadores de Git:
     ```text
     <<<<<<< HEAD
     código tuyo local (cambios nuevos)
     =======
     código que ya está en main (cambios de tus compañeros)
     >>>>>>> origin/main
     ```
2. **No adivines, comunica**: Si no estás seguro de qué cambio debe prevalecer, habla con el desarrollador que tocó ese archivo. **Nunca elimines código de otros sin validar.**
3. **Validación obligatoria antes de commitear**: Una vez resuelto el conflicto en el archivo, **NO haces commit de inmediato**. Ejecuta primero las validaciones:
   ```bash
   pnpm lint
   pnpm typecheck
   pnpm test
   ```
   Si los tests pasan, el conflicto se resolvió sin romper la lógica.
4. **Finaliza el merge y sube**:
   ```bash
   git add .
   git commit -m "[KAN-123] - ci(merge): resolver conflictos con main"
   # Usa siempre --force-with-lease si necesitas forzar un push
   git push origin <rama> --force-with-lease
   ```
   > [!CAUTION]
   > Nunca uses `git push --force` a secas. El comando `--force-with-lease` valida que nadie haya subido nuevos commits a tu rama en el remoto antes de sobreescribir la historia, evitando que borres accidentalmente el trabajo de un compañero.

> Fuente única para **Correcto / Incorrecto: revisión 2026**: [abrir documento canónico](../../../governance/documentation-dry-and-ownership.md).

### ✅ Correcto / ❌ Incorrecto — Guia GitHub, Jira, AWS y CI/CD 2026 - `bus-impl`

✅ **Correcto:** Para **Guia GitHub, Jira, AWS y CI/CD 2026 - `bus-impl`**, limitar roles cloud, medir el coste y utilizar enlaces a las guías AWS propietarias.

❌ **Incorrecto:** En **Guia GitHub, Jira, AWS y CI/CD 2026 - `bus-impl`**, copiar credenciales AWS, inventar precios o meter la configuración cloud dentro del modelo de negocio.
