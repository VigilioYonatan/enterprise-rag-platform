# Fábrica De Pipelines CI/CD Y Plantillas Reutilizables

Define los estándares para la unificación, centralización y gobernanza de flujos de integración y entrega continua en la plataforma Vigilio.

## Centralización Frente A Duplicación

Una mala práctica recurrente en polirepositorios es duplicar archivos de pipeline completos (por ejemplo, `container-gitops.yml`) entre servicios de backend y frontend. Esto provoca deriva de versiones, diferencias en las comprobaciones de seguridad y alto coste de mantenimiento.

La Fábrica de Pipelines centraliza los flujos reutilizables en un repositorio corporativo de gobernanza (`platform-actions`):

```text
platform-actions/
├── .github/workflows/
│   ├── reusable-lint-test.yml     # Plantilla canónica de linters y pruebas
│   ├── reusable-container-build.yml# Plantilla de build OCI, SBOM y firma Cosign
│   └── reusable-gitops-promote.yml# Plantilla de promoción declarativa hacia deploy/
```

## Consumo Declarativo Desde Repositorios De Aplicación

Los repositorios individuales (`apps/backend`, `apps/frontend`) definen archivos mínimos que invocan la plantilla canónica sin duplicar lógica:

```yaml
# apps/bus-impl/.github/workflows/ci.yml
name: CI/CD Pipeline

on:
  push:
    branches: [main]
  pull_request:

jobs:
  pipeline:
    uses: Vigilio-Services/vigilio-platform-actions/.github/workflows/reusable-container-build.yml@v0.8.0
    with:
      service-name: bus-impl
      dockerfile-path: ./Dockerfile
    secrets: inherit
```

## Etapas Obligatorias Del Pipeline Corporativo

1. **Gate 1 - Calidad y Pruebas:** Formato (Biome/Prettier), compilación TypeScript/PHP y ejecución de suites de tests unitarios e integrados.
2. **Gate 2 - Seguridad de Código y Dependencias:** Escaneo SAST (Semgrep/CodeQL) y análisis de vulnerabilidades en dependencias (Snyk/Trivy).
3. **Gate 3 - Construcción Inmutable:** Creación de imagen OCI multi-arquitectura con buildx y digest SHA-256 inmutable.
4. **Gate 4 - Cadena de Suministro:** Generación de SBOM con Syft y firma criptográfica con Cosign (Keyless con GitHub OIDC).
5. **Gate 5 - Promoción GitOps:** Creación de Pull Request o commit gobernado sobre el repositorio `deploy/`.

## Prerrequisitos De Ejecución

1. Repositorio corporativo `platform-actions` publicado con permisos de lectura para organizaciones autorizadas.
2. Configuración de GitHub OIDC Provider federado con AWS IAM (o GCP Workload Identity) para emisión de tokens efímeros sin credenciales estáticas.
3. Runners de GitHub Actions efímeros o GitHub-hosted configurados con aislamiento estricto por build.
4. Cosign y Syft preinstalados o cacheados con verificación de integridad SHA-256 en las acciones reutilizables.

## Matriz De Decisiones De Estrategia De CI/CD

| Criterio | Pipeline Reutilizable Centralizado | Workflow Local Específico | Script Monolítico en Dockerfile |
|---|---|---|---|
| Reusabilidad | Alta (versionado SemVer `@v0.8.0`) | Nula (duplicación en cada repositorio) | Baja (opaco para el orquestador CI) |
| Gobernanza de Seguridad | Centralizada y auditable automáticamente | Descentralizada y propensa a desalineación | Oculta; auditoría estática compleja |
| Mantenibilidad | Un único punto de parcheo y actualización | Decenas de copias manuales divergentes | Requiere reconstruir imagen base |
| Control de Acceso a Secretos | OIDC federado con ámbito de repositorio/entorno | Secretos de repositorio redundantes | Variables de entorno en capas de imagen |

## Procedimiento Operativo De Centralización De Pipelines

1. **Definición de Plantilla Canónica:** Crear flujo reutilizable en `platform-actions/.github/workflows/reusable-*.yml` con parámetros fuertemente tipados (`inputs` y `secrets`).
2. **Publicación y Tagging SemVer:** Etiquetar releases estables inmutables (`v0.8.0`) tras superar la suite de evals y validaciones de plataforma.
3. **Migración de Repositorio Consumidor:**
   - Eliminar jobs duplicados en `.github/workflows/ci.yml`.
   - Incorporar bloque `uses: Vigilio-Services/vigilio-platform-actions/.github/workflows/reusable-container-build.yml@v0.8.0`.
   - Configurar `permissions: { id-token: write, contents: read }`.
4. **Validación de Ejecución en Pull Request:** Comprobar que el pipeline se ejecuta en runner efímero, genera SBOM en formato SPDX/CycloneDX y firma la imagen con Cosign.

## Pruebas Negativas Y Detección De Fallos

- **Detección de Claves Secretas Estáticas:** Intentar inyectar variables de entorno con prefijos `AWS_SECRET_ACCESS_KEY` o `AWS_ACCESS_KEY_ID`; el linter de workflow y el escáner de secretos deben bloquear el pull request.
- **Bloqueo de Bypass de Pruebas:** Si un repositorio intenta invocar tests con flags `--skip-tests` o `--ignore-failures`, el gate de calidad corporativo debe emitir veredicto `FAIL`.
- **Rechazo de Referencias Mutables:** El analizador de dependencias de workflows debe fallar si detecta invocaciones apuntando a ramas flotantes como `@main` o `@master` en entornos productivos.

## Procedimiento De Rollback Y Recuperación

1. **Reversión Rápida de Versión de Plantilla:** Si una actualización de la plantilla reutilizable `v0.8.1` introduce regresiones, actualizar el tag en el repositorio consumidor a `v0.8.0` mediante commit declarativo.
2. **Mitigación por Caída de Runners OIDC:** En caso de degradación temporal del proveedor OIDC de GitHub, conmutar transitoriamente a credenciales restringidas con TTL de 1 hora mediante break-glass auditado.
3. **Invalidación de Imágenes sin Firma:** Si un pipeline produce una imagen OCI sin firma Cosign verificada, el admission controller Kyverno/Gatekeeper en Kubernetes debe rechazar su admisión en el clúster.

## Evidencia Requerida Para Gates

- Archivo de workflow consumidor invocando plantilla con tag SemVer inmutable (`@v0.8.0`).
- Token OIDC generado y registrado en auditoría CloudTrail con rol asumido de mínimo privilegio.
- Attestation SLSA y firma Cosign adjunta al digest SHA-256 de la imagen en el registro OCI.
- Reporte `reports/cicd-pipeline-evidence.json` con `preflight_passed: true` y `verification_status: VERIFIED`.

## ✅ Correcto / ❌ Incorrecto

- ✅ **Correcto:** Invocar flujos de trabajo reutilizables versionados (`@v0.8.0`) desde un repositorio centralizado de plataforma.
- ❌ **Incorrecto:** Copiar y pegar 300 líneas de YAML de pipeline entre múltiples aplicaciones de backend y frontend.
- ✅ **Correcto:** Mantener secretos y credenciales restringidas a nivel de organización o entorno con permisos de mínimo privilegio.
- ❌ **Incorrecto:** Definir pasos de construcción con flags de omisión de pruebas (`--skip-tests`) para acelerar la entrega en ramas principales.
