# EAS, Stores, OTA Y FinOps Mobile

## Responsabilidades

EAS compila/distribuye binarios y actualizaciones; App Store/Play Store gobiernan revisión y rollout.
Terraform no crea binarios móviles ni reemplaza la configuración de stores. La infraestructura del
backend continúa en `infra/`.

## Perfiles

`eas.json` declara development, test, staging y production; test es QA y no un stage backend. Cada build registra commit, profile,
platform, application ID, app version, build number y runtime fingerprint. Production usa incremento
controlado y credenciales administradas por EAS o un vault aprobado.

## OTA

- Canal aislado por ambiente.
- Runtime fingerprint para compatibilidad nativa.
- Rollout gradual y monitoreo de crash/error budget.
- Actualización firmada y fuente autorizada.
- Rollback probado a una actualización compatible.

OTA no corrige un cambio de plugin/módulo nativo; requiere nuevo binario. Tampoco debe saltarse una
revisión obligatoria de store o política de negocio.

## Distribución

Development/test/staging usan distribución interna con testers inventariados. Production pasa por
tracks cerrados/TestFlight antes de rollout gradual. Metadata, privacy labels, screenshots, edades y
declaraciones de permisos forman parte del release.

Los profiles seleccionan explícitamente EAS environments: development/test -> `development`, staging
-> `preview`, production -> `production`. URLs y secretos se administran allí; el repositorio sólo
declara `EXPO_PUBLIC_STAGE`, porque cualquier `EXPO_PUBLIC_*` es visible en el bundle.

## FinOps

Los principales drivers móviles son:

- minutos/concurrencia EAS y almacenamiento de artefactos;
- dispositivos de testing y granja remota;
- crash/analytics/RUM por volumen y retención;
- CDN/egress y tamaño de imágenes/uploads;
- fees/cuentas de stores y operación de certificados;
- costo backend generado por polling, retry y chat/upload.

Se etiqueta o atribuye costo por aplicación, ambiente y equipo cuando el proveedor lo permite. El
budget alerta antes del cierre del mes y distingue crecimiento de usuarios de regresión técnica.

## Evidencia de release

- build URL/ID y digest cuando esté disponible;
- resultado de gates y E2E;
- SBOM/provenance;
- aprobación y tester track;
- dashboards y criterio de rollout;
- rollback realizado o ensayado.

## Estado honesto

Un `eas.json` válido no demuestra que credenciales, firma, revisión de stores o rollout funcionen. Se
declaran probados solo después de una ejecución real verificable.

> Fuente única para **Correcto / Incorrecto: revisión 2026**: [abrir documento canónico](../../../../governance/documentation-dry-and-ownership.md).

### ✅ Correcto / ❌ Incorrecto — EAS, Stores, OTA Y FinOps Mobile

✅ **Correcto:** Para **EAS, Stores, OTA Y FinOps Mobile**, usar artefactos reproducibles, ambientes protegidos y rollback verificable.

❌ **Incorrecto:** En **EAS, Stores, OTA Y FinOps Mobile**, publicar sin controlar cambios, permisos, compatibilidad o métricas de rollback.
