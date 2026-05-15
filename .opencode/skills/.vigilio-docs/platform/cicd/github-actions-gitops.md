# GitHub Actions + GitOps: gates reproducibles

```text
PR -> format/static -> unit -> integration PostgreSQL/Redis
   -> OpenAPI diff -> SCA/audit + SBOM -> build y scan imagen
   -> firma/provenance -> GitOps PR -> canary -> verificación SLO -> promotion
```

En PHP: Composer lock, Pest 5, Larastan, Pint, `composer audit --locked`. En TS: pnpm lock, Biome, Vitest, typecheck, schema/docs tests. Política común: `permissions` mínimos y OIDC con cloud role, sin tokens duraderos en YAML. Incluir dependabot/renovate con compatibilidad verificada antes de merge.

```yaml
# Fragmento ilustrativo NO reemplaza workflow reusable de plataforma.
permissions:
  contents: read
  id-token: write
concurrency:
  group: vigilio-staging
  cancel-in-progress: false
```

Argo CD aplica manifiestos aprobados, Rollouts/Helm gestionan canary y rollback, readiness/liveness y SLO. El lugar ejecutable de workflows compartidos es `vigilio-platform-actions`. No afirmar que existe integración entre repositorios sin evidencia ejecutada.

## ✅ Correcto / ❌ Incorrecto: revisión 2026

- ✅ **Correcto:** Separar estrategia por runtime (EKS vs Lambda) y validar manifests/IaC, acceso mínimo, health checks, rollback.
- ❌ **Incorrecto:** Confundir workflows de Lambda con EKS o tratar muestras YAML como un despliegue verificado.
- **Al recibir código existente:** primero caracterizar el comportamiento, después refactorizar en pasos comprobables. [Guía canónica de modernización](../../standards/engineering/refactoring-existing-code.md).

## Gates y despliegue por runtime

- **Aplicación PHP:** `composer validate --strict`, `composer audit --locked`, `vendor/bin/pint --test`, PHPStan/Larastan, Pest, integración PostgreSQL y contrato OpenAPI. Fijar `composer.lock` y runtime.
- **Aplicación Node:** `corepack`/lockfile, lint, typecheck, Vitest, integración DB, export/diff OpenAPI y SBOM según política.
- **Infraestructura:** validar chart con `helm lint` + template, permisos, probes, resources requests/limits, policy checks y dry-run en cluster adecuado.
- **GitOps:** versionar manifests/values, promover con aprobación, smoke checks y rollback. La existencia de un workflow YAML no es prueba de despliegue.

✅ Usar OIDC con cloud credentials temporales y permisos mínimos. ❌ Subir claves cloud estáticas, reutilizar un workflow de Lambda para despliegue EKS o deshabilitar checks de seguridad porque bloquean releases.

### Evidencia de cambio

Cada PR debe registrar artefacto construido, digest, tests, escaneos relevantes y ambiente. Guardar logs de despliegue sin secretos y comparar métricas durante canary; rollback requiere criterios medibles.

## Pipeline mínimo verificable

```yaml
name: quality-and-release
on: [pull_request]
permissions:
  contents: read
jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4 # fijar a SHA aprobado antes de habilitar en producción
      - name: Runtime reproducible
        run: echo 'Instalar Node/PHP según baseline y locks aprobados'
      - name: Calidad
        run: echo 'Ejecutar lint, typecheck, tests, auditoría, contrato y pruebas de integración'
```

La plantilla **no es un workflow productivo**, sino un esqueleto de controles: sustituir `echo` por jobs reales, fijar SHA de actions, mínima capacidad de token y pasar gates antes de publicar.

**Promoción GitOps:** construir imagen por digest, firmar/emitir SBOM, verificar policy, proponer commit en repo de ambientes, Argo CD sincroniza tras aprobación, y validar rollout (readiness, error rate, SLO). Guardar evidencia de digest, tests y revisión. No hacer `kubectl apply` manual como procedimiento estándar de producción.

✅ OIDC de GitHub a AWS, credenciales temporales y permisos mínimos. ❌ Secrets largos en YAML, tags `latest`, deploy sin rollback ni control de concurrencia.

**Gate:** pull request fallida no publica; staging smoke y canary métricas antes de ampliar; documentar rollback de imagen **y** compatibilidad de schema de base de datos.

**Implementación propia del tema:** [CI específica Laravel/PHP](../../stacks/backend/laravel/quality/ci-quality.md).
