# DevSecOps y CI/CD por capacidad

Gate obligatorio por cambio: formato, lint/análisis estático, unit/integration/contract, `composer audit` o equivalente, SCA/SBOM, secret scanning, imagen firmada, policy de despliegue, evidencia trazable. No ocultar controles no ejecutados.

Pipeline propuesto:

```text
commit -> format/static checks -> unit -> PostgreSQL/Redis integration
       -> OpenAPI diff -> dependency audit -> build container/SBOM
       -> image scan/sign -> GitOps PR -> canary/rollback -> SLO monitoring
```

GitHub reusable workflows y actions ejecutables pertenecen a `vigilio-platform-actions` (cuando disponible). Este documento prescribe calidad y referencias; no afirma que el pipeline esté activo en el ZIP.

PHP: `composer validate --strict`, `composer audit --locked`, Pint, Larastan, Pest. El runtime PHP-FPM y workers deben compartir release, configuración y healthcheck. Kubernetes aplica probes, recursos, IAM, secretos y políticas.

[Plataforma](../../platform/cicd/github-actions-gitops.md) · [Laravel quality](../../stacks/backend/laravel/quality/ci-quality.md).

## ✅ Correcto / ❌ Incorrecto: revisión 2026

- ✅ **Correcto:** Versiones basadas en lockfiles, escaneo dependencias, CI con gates reales, rollback y aprobaciones.
- ❌ **Incorrecto:** Declarar `PASS` sin ejecutar gates, instalar dependencias latest sin compatibilidad o subir secretos a pipelines.
- **Al recibir código existente:** primero caracterizar el comportamiento, después refactorizar en pasos comprobables. [Guía canónica de modernización](../engineering/refactoring-existing-code.md).

## Cobertura de implementación y evidencia (ampliación)

Estas comprobaciones concretan el tema de esta guía; aplicar solo las pertinentes al sistema consumidor y documentar exclusiones justificadas.

1. **Gate por amenaza:** Bloquear cambios de permisos, credenciales o cadenas de suministro sin pruebas y revisión especializada.
2. **Artefacto reproducible:** Generar SBOM, lockfile controlado y firmas donde proceda; validar origen del build.
3. **Privilegios mínimos:** Separar credenciales de CI por entorno y job; usar identidad federada cuando proceda.
4. **Recuperación:** Comprobar rollback real, migraciones compatibles y mecanismo de revocación de secretos.
5. **Evidencia:** Adjuntar logs y hashes de scanner/test; un comando no ejecutado es NOT_RUN.

✅ **Correcto:** conservar el flujo funcional y demostrar criterios de aceptación con tests, trazas, revisión de contratos o un plan reproducible según el riesgo.

❌ **Incorrecto:** sustituir las reglas de negocio por un resumen, copiar implementaciones de otro framework, declarar cobertura sin evidencia o presentar `NOT_RUN` como `PASS`.

**Salida mínima:** responsable del control, riesgo cubierto, evidencia verificable y estado `PASS | FAIL | NOT_RUN | BLOCKED`. Los comandos de ejemplo son ilustrativos salvo que se adjunte ejecución real.

**Implementación propia del tema:** [CI Laravel/PHP](../../stacks/backend/laravel/quality/ci-quality.md).
