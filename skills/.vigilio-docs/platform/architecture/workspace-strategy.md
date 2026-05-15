# Estrategia De Workspaces E Higiene De Artefactos

Define la estrategia de organización del espacio de trabajo de desarrollo y automatización, asegurando reproducibilidad, seguridad de cadena de suministro y limpieza de artefactos en los entornos de Vigilio.

## Modelos De Organización De Workspace

La organización de repositorios múltiples debe responder a la escala arquitectónica ([Nivel 1 Compose VPS, Nivel 2 Kubernetes GitOps o Nivel 3 Cloud AWS](reference-topologies.md)), propiedad, ciclo de lanzamiento y permisos del equipo:

1. **Checkout Multi-Repositorio Coordinado (Estándar Nivel 1 `compose-vps`):** Agrupa localmente repositorios Git independientes (`apps/<product>-impl`, `apps/<product>-web`, `<product>-deploy`, `platform-ops`, `prod-local`). **La raíz coordinadora carece deliberadamente de `package.json`, `pnpm-workspace.yaml` y `pnpm-lock.yaml`** para impedir acoplamiento de dependencias y proteger los contextos de compilación OCI.
2. **Submódulos Git Auditables (Estándar Niveles 2 y 3 GitOps):** Enlaza repositorios independientes mediante `.gitmodules` con commit SHAs fijados (`git clone --recurse-submodules`), permitiendo un checkout reproducible para laboratorios integrales sin fusionar historiales, permisos ni ciclos de release.
3. **Manifiestos de Workspace Declarativos:** Archivos estructurados (`workspace.yaml`, `versions.yaml`) que especifican los repositorios y versiones exactas de herramientas CLI que componen el entorno.
4. **Monorepo con Fronteras Estrictas:** Repositorio único gobernado por `CODEOWNERS` y herramientas de build incremental únicamente cuando un mismo equipo lanza todos los artefactos de forma atómica.
5. **Dependencias e Imágenes OCI Inmutables:** Servicios desacoplados que se integran exclusivamente mediante contratos OpenAPI verificados en CI e imágenes firmadas por digest (`@sha256:...`), **sin crear carpetas `contracts/` compartidas por sistema de archivos**.

> [!TIP]
> Incluso en repositorios individuales que no son monorepos, `pnpm-workspace.yaml` con `packages: []` debe emplearse como mecanismo declarativo de endurecimiento supply-chain.

```text
workspace-root/                     # Sin package.json ni contracts/ en la raíz
├── versions.yaml                   # Matriz canónica de herramientas CLI (Terraform, Helm, Conftest, Kind)
├── apps/
│   ├── <service>-impl/             # Repo independiente (con pnpm-workspace.yaml packages: [])
│   └── <service>-web/              # Repo independiente (con pnpm-workspace.yaml packages: [])
├── deploy/                         # <product>-deploy (Compose) o deploy GitOps (Helm/Kustomize/Kyverno)
├── infra/                          # platform-ops (Ansible) o raíces Terraform aisladas
└── prod-local/                     # Orquestador local sin binarios ni secretos comiteados
```

## Endurecimiento Supply-Chain En Repositorios Node (`packages: []`)

Cada repositorio de aplicación Node/TypeScript define su propio `pnpm-workspace.yaml` con `packages: []` para bloquear ejecución arbitraria de scripts `postinstall`, exigir integridad criptográfica del store y establecer edad mínima de publicación contra ataques de paquetes recién comprometidos:

```yaml
packages: []

engineStrict: true
preferFrozenLockfile: true
verifyStoreIntegrity: true
strictStorePkgContentCheck: true
strictDepBuilds: true
dangerouslyAllowAllBuilds: false
minimumReleaseAge: 1440

allowBuilds:
  "@scarf/scarf": false
  "@biomejs/biome": true
  "@nestjs/core": true
  esbuild: true
  sharp: true
```

## Higiene Estricta De Artefactos

El workspace debe mantenerse libre de binarios descargados, artefactos temporales y residuos de compilación. Los scripts de bootstrap descargan binarios fijados con verificación SHA-256 dentro de `.tools/` (ignorado por Git).

Las carpetas y archivos estrictamente prohibidos en el árbol versionado son:
- `.terraform/`, `*.tfstate`, `*.tfstate.backup`, inventarios físicos reales fuera de variables protegidas
- `node_modules/`, `dist/`, `.pnpm-store/`, `.tools/`
- `.logs/`, `*.log`, `.artifacts/`, `evidence/`, `coverage/`, `playwright-report/`, `test-results/`
- Archivos `.env` con secretos en texto claro o tokens `.npmrc` autenticados
- Carpetas `contracts/` manuales duplicadas o copias de respaldo (`backup/`, `old/`)

## Control Canónico De Versiones De Herramientas

Las herramientas CLI utilizadas por los ingenieros y los pipelines de CI provienen de una única matriz declarativa en `versions.yaml` (y las librerías de aplicación de [technology/versions.md](../../technology/versions.md)). Se prohíbe tener versiones flotantes o divergentes entre scripts de PowerShell, Bash y CI:

```yaml
tools:
  terraform: "1.15.9"
  helm: "4.2.3"
  kubectl: "1.32.2"
  kustomize: "5.6.0"
  kubeconform: "0.6.7"
  conftest: "0.58.0"
  kind: "0.27.0"
  cosign: "2.4.3"
```

## Prerrequisitos De Ejecución

1. Motor Git instalado (versión >= 2.40) con soporte para submódulos recursivos y `sparse-checkout`.
2. Archivo canónico `.gitignore` en cada repositorio configurado según la taxonomía corporativa.
3. Scripts de bootstrap que verifiquen el checksum SHA-256 de cada binario descargado en `.tools/`.
4. Matriz `versions.yaml` versionada cuando el proyecto opere herramientas de plataforma.

## Matriz De Decisiones De Estrategia De Workspaces

| Criterio | Checkout Multi-Repo (Nivel 1) | Submódulos Git (Niveles 2–3) | Manifiesto Declarativo (`workspace.yaml`) | Monorepo Único |
|---|---|---|---|---|
| Acoplamiento de Git | Nulo entre repositorios | Explícito por SHA en árbol padre | Nulo (declarativo en tooling) | Máximo (un solo repositorio) |
| Independencia de CI/CD | Total por repositorio | Total por repositorio | Total por repositorio | Requiere path-filtering |
| Gobernanza de Permisos | Fina por repositorio | Fina por repositorio hijo | Fina por repositorio hijo | `CODEOWNERS` granular |
| Protección de Build Context OCI | Óptima (contextos aislados) | Óptima por submódulo | Óptima por repositorio | Riesgo de invalidar caché global |

## Procedimiento Operativo De Higiene Y Sincronización

1. **Inicialización Limpia:** Clonar los repositorios independientes o ejecutar `git clone --recurse-submodules` según la estrategia elegida; nunca ejecutar `pnpm install` en la carpeta coordinadora raíz.
2. **Auditoría de Higiene Local:** Invocar `git status --ignored` para confirmar que ningún archivo `.tfstate`, `.tools/`, `node_modules` o `.env` se encuentre sin ignorar.
3. **Verificación de Versiones y Checksums:** El bootstrap valida hashes SHA-256 y compara las versiones activas contra `versions.yaml`.
4. **Limpieza Automatizada de Residuos:** Configurar hooks de pre-commit (`gitleaks`) y tareas de limpieza que purguen artefactos temporales locales.

## Pruebas Negativas Y Detección De Fallos

- **Bloqueo de Estado Terraform o Ejecutables en Git:** Simular creación de `terraform.tfstate` o binarios `.exe`/ELF; el pre-commit hook y el CI de gobernanza rechazan el commit inmediatamente.
- **Detección de Subcarpetas Git Huérfanas:** Si un desarrollador clona un repositorio anidado dentro de un repositorio padre sin registrarlo como submódulo ni ignorarlo, el scanner de workspace emite fallo `ORPHAN_GIT_REPO`.
- **Bloqueo de Build Scripts No Autorizados:** Si una dependencia transitiva añade un script `postinstall` fuera de `allowBuilds` en `pnpm-workspace.yaml`, `pnpm install --frozen-lockfile` falla cerrado.

## Procedimiento De Rollback Y Recuperación

1. **Purga Forzada de Residuos (Clean Slate):** En caso de contaminación de dependencias, ejecutar `git clean -fdx -e .env.local` dentro del repositorio afectado y reinstalar con `--frozen-lockfile`.
2. **Reversión de Versión de Herramienta:** Si una actualización en `versions.yaml` rompe compatibilidad, revertir el commit en el repositorio de plataforma.
3. **Recuperación de Submódulos Desincronizados:** Ejecutar `git submodule update --init --recursive` o `git submodule foreach --recursive git reset --hard` para alinear los árboles hijos con el SHA aprobado.

## Evidencia Requerida Para Gates

- `.gitignore` y `.gitleaks.toml` validados contra la lista negra corporativa de artefactos y secretos.
- `pnpm-workspace.yaml` con `strictDepBuilds: true`, `dangerouslyAllowAllBuilds: false` y `verifyStoreIntegrity: true` en cada repositorio Node.
- Reporte `reports/workspace-evidence.json` con `preflight_passed: true`, `hygiene_clean: true` y `boundaries_isolated: true`.

## ✅ Correcto / ❌ Incorrecto

- ✅ **Correcto:** Mantener la raíz multi-repo sin `package.json`, aplicar `packages: []` con lista blanca `allowBuilds` dentro de cada app y verificar checksums SHA-256 de herramientas descargadas en `.tools/`.
- ❌ **Incorrecto:** Comitear ejecutables binarios, carpetas `.logs/`, `.artifacts/`, carpetas `contracts/` duplicadas o dumps de base de datos dentro del repositorio.
- ✅ **Correcto:** Centralizar las versiones de herramientas CLI en `versions.yaml` y las de librerías en `technology/versions.md`.
- ❌ **Incorrecto:** Permitir `dangerouslyAllowAllBuilds: true` o compartir `node_modules` entre repositorios independientes.
