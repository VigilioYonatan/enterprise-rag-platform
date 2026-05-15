# Gobierno, Releases Y Ownership Mobile

## Owners

`CODEOWNERS` protege shell/navegación, sesión, contratos, workflows, configuración Expo/EAS y plugins
nativos. Una feature tiene owner de producto/ingeniería y un contacto operacional.

## Jerarquía

1. Política organizacional y seguridad.
2. Contrato backend/store.
3. ADR/threat model.
4. Estándar mobile.
5. Convención local de feature.

Una README local no puede debilitar controles superiores sin excepción formal.

## Versionado

- SemVer para paquetes/librerías.
- App version visible y build number monotónico por plataforma.
- Runtime version compatible con binario.
- Contratos HTTP compatibles o migración coordinada.
- Feature flags con owner, default seguro y fecha de retiro.

## Branching y promoción

Trunk-based: ramas cortas, PR requerido y main siempre desplegable. Development, staging y production
son ambientes, no ramas largas. La promoción referencia commit/build inmutable y genera un commit
GitOps solo donde corresponda al backend; la app usa EAS/store rollout.

## ADR y threat model

Obligatorios para auth, biometría, deep links, almacenamiento sensible, permisos, analytics, pagos,
WebView, OTA, módulos nativos y super-app boundaries. Incluyen alternativas, consecuencias,
migración, rollback y evidencia.

## Releases

Release notes enumeran cambios de usuario, migraciones, permisos nuevos, backend mínimo, riesgos y
rollback. El equipo verifica compatibilidad N/N-1 cuando el negocio requiere usuarios en versiones
antiguas.

## Dependabot y excepciones

Actualizaciones automatizadas pasan Expo compatibility, tests y export. Una excepción de CVE/licencia
incluye owner, ticket, justificación, mitigación y expiración; no existe allowlist permanente sin
revisión.

## Documentación

El mismo PR actualiza guía, runbook y decisión afectada. `_site` es output generado; Markdown y
sidebar son fuentes.

> Fuente única para **Correcto / Incorrecto: revisión 2026**: [abrir documento canónico](../../../../governance/documentation-dry-and-ownership.md).

### ✅ Correcto / ❌ Incorrecto — Gobierno, Releases Y Ownership Mobile

✅ **Correcto:** Para **Gobierno, Releases Y Ownership Mobile**, mantener una norma propietaria y evidencia trazable por cambio.

❌ **Incorrecto:** En **Gobierno, Releases Y Ownership Mobile**, repetir políticas transversales en cada skill y afirmar aprobaciones no verificadas.
