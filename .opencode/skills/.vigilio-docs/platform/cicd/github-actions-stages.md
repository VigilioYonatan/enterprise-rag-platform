# GitHub Actions: gates, stages y despliegue controlado

Compartido entre Node/Nest, Laravel, web y móvil: pull request corto con checks, build reproducible, locks, auditoría de dependencias, test y verificación de cambios OpenAPI. El despliegue requiere evidencias, artefactos inmutables y Environment protections.

## Gates

1. PR: docs enlazados, type/static analysis, lint, tests + contract diff y scanners.
2. Build: artifact versionado, SBOM y firma/attestation si política exige.
3. Staging: pruebas integradas, smoke, canary/rolling según runtime.
4. Producción: aprobación apropiada, observabilidad, rollback documentado y evidencia operacional.

✅ Correcto: branch protection/OIDC, rollback automático por SLO, locks revisados, logs enmascarados.

❌ Incorrecto: hacer deploy de `latest`, saltar gates cuando el agente lo sugiere, introducir secretos de AWS en repo.

Proyectos consumidores deben mantener workflows ejecutables; `vigilio-docs` documenta estándares y ejemplos, mientras las acciones centralizadas externas poseen implementaciones. [Política general](../../standards/devsecops/supply-chain.md).

## Procedencia documental preservada

- [Capítulo heredado: 4-devsecops.md](references/4-devsecops.md) — contenido íntegro conservado.
- [Capítulo heredado: 28-cicd-aws-stages-observability.md](references/28-cicd-aws-stages-observability.md) — contenido íntegro conservado.
- [Capítulo heredado: 37-cicd-jobs-resumen.md](references/37-cicd-jobs-resumen.md) — contenido íntegro conservado.

## Pipeline ilustrativo: gates separados y permisos mínimos

El pipeline compartido define **evidencias y orden**, no copia un workflow distinto para cada stack. Los workflows reales viven en el consumidor/`vigilio-platform-actions`; esta muestra debe adaptarse a la estrategia de GitOps y permisos del repositorio.

```yaml
# Ejemplo de PR: los comandos del stack se resuelven en sus workflows propios.
name: validate
on:
  pull_request:
permissions:
  contents: read
jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@<COMMIT_SHA_VERIFICADO>
      - name: Validate canonical contracts and stack gates
        run: ./scripts/ci/validate-all.sh
```

`<COMMIT_SHA_VERIFICADO>` es un placeholder obligatorio: fijar la acción por SHA revisado; `validate-all.sh` representa un script del consumidor **que debe existir**. Nunca copiar este ejemplo literalmente a producción sin resolver ambos.

### Diseño de gates (por cambio)

| Momento | Validación mínima | Bloqueo obligatorio |
| --- | --- | --- |
| Pull request | Formato, estática, unitarios, políticas, documentación/links | Fallo o evidencia ausente |
| Integración | Contratos OpenAPI, DB real, seguridad por tenant, caché, idempotencia | Breaking change no aprobado |
| Artifact | Lockfile, dependencias, SBOM, firma/provenance, imagen por digest | Vulnerabilidad crítica no exceptuada |
| Staging | Smoke, métricas, trazas, migraciones compatibles, rollback ensayado | Regresión/alerta de SLO |
| Producción | Aprobación protegida, OIDC, rollout gradual, observabilidad | Fallo de condiciones / falta de autorización |

Los workers y cronjobs requieren smoke propio; un `build` verde no prueba reintentos, DLQ ni entrega exactamente una vez. No mezclar la estrategia Lambda con Kubernetes en una misma receta operativa; cada runtime elige su perfil de despliegue.

✅ Correcto: auditar **el artifact que se desplegó**, mantener permisos `read` por defecto y usar OIDC con confianza restringida.

❌ Incorrecto: credenciales estáticas, tag `latest`, `continue-on-error` en security gates o degradar PR check porque el runner no está disponible.

**Implementación propia del tema:** [CI específica Laravel/PHP](../../stacks/backend/laravel/quality/ci-quality.md).
