# Evaluación, Roadmap Y Operación Mobile

## Evaluar con evidencia

| Área | Evidencia mínima |
|---|---|
| Arquitectura | boundaries y dependency rules |
| Calidad | lint, typecheck, tests y coverage |
| Mobile | Expo Doctor, export y dispositivos |
| Seguridad | threat model, scans y secretos |
| Delivery | build firmado, SBOM y aprobación |
| Operación | SLO, alertas, runbook y rollback |

Una calificación alta local no equivale a producción probada.

## Base de ingeniería

La plantilla debe ofrecer contratos, CRUD, upload, auth, rutas, lifecycle de queries, SecureStore,
NativeWind, CI y documentación. Cada producto elimina ejemplos no usados y reemplaza identidad,
branding, endpoints y dominio.

## P0 — antes de usuarios externos

- package/application IDs definitivos;
- auth/refresh/logout completos;
- política de privacidad y permisos;
- crash reporting redactado;
- build firmado Android/iOS;
- E2E crítico en dispositivo;
- rollback de backend/binario/OTA.

## P1 — operación enterprise

- SLO y burn-rate alerts;
- rollout gradual y version adoption;
- observabilidad correlacionada;
- accessibility audit real;
- performance budgets por device class;
- rotación de credenciales y ownership on-call.

## P2 — optimización

Offline avanzado donde aporte valor, visual regression, device farm, experiments gobernados y costo
por journey. No se añade complejidad sin métrica o necesidad.

## Deuda explícita

Registrar descripción, impacto, owner, fecha objetivo y criterio de cierre. Ejemplos: refresh token
incompleto, CRD/workflow no publicado, cobertura E2E solo Android o telemetría sin dashboard.

## Runbook mínimo

Diagnóstico por versión/ambiente, salud backend, crash cluster, OTA activo, feature flags, mitigación,
rollback y comunicación. El soporte nunca solicita tokens ni PII completa al usuario.

## Criterios para 10/10

Todos los gates locales pasan; CI real es verde; builds firmados se instalaron; Maestro corrió en la
matriz; SLO/alertas producen evidencia; privacy/security fueron revisados; rollback fue ensayado. Si
falta una condición, se declara pendiente.

> Fuente única para **Correcto / Incorrecto: revisión 2026**: [abrir documento canónico](../../../../governance/documentation-dry-and-ownership.md).

### ✅ Correcto / ❌ Incorrecto — Evaluación, Roadmap Y Operación Mobile

✅ **Correcto:** Para **Evaluación, Roadmap Y Operación Mobile**, mantener una norma propietaria y evidencia trazable por cambio.

❌ **Incorrecto:** En **Evaluación, Roadmap Y Operación Mobile**, repetir políticas transversales en cada skill y afirmar aprobaciones no verificadas.
