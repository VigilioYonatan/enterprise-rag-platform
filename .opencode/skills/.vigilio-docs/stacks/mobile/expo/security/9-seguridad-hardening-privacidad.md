# Seguridad, Hardening Y Privacidad Mobile

## Modelo de confianza

El dispositivo es un cliente no confiable: puede estar rooteado, instrumentado o ejecutar una versión
antigua. Autorización, límites, firma de uploads y reglas de negocio permanecen en backend.

## Secretos y sesión

- `EXPO_PUBLIC_*` nunca contiene secretos.
- Tokens viven en SecureStore/Keychain/Keystore y no en AsyncStorage.
- Logout borra tokens, caches sensibles y tareas pendientes.
- PII no aparece en logs, analytics, nombres de archivo ni crash reports.
- Screenshots/app switcher se restringen solo para flujos cuyo threat model lo exige.

Ofuscación no convierte una credencial embebida en secreto.

## Red

TLS es obligatorio. Certificate pinning requiere módulo nativo, rotación de certificados, fallback y
runbook; solo se adopta por ADR y threat model. Nunca se desactiva validación TLS para “resolver” dev.

## Deep links y WebViews

Links validan allowlist de scheme/host/path. OAuth usa PKCE y redirect exacto. WebView se evita para
contenido no controlado; si existe, desactiva capacidades innecesarias, limita navegación y puente
JavaScript, y no comparte tokens por query string.

## Archivos y permisos

Pedir permisos just-in-time, explicar propósito y funcionar ante rechazo. Upload valida nombre,
extensión, MIME y tamaño tanto en cliente como servidor. Archivos temporales sensibles tienen
retención definida.

## Supply chain y binarios

- lockfile congelado y package manager fijado;
- actions por SHA, dependency review, SAST, secret scan, SBOM y provenance;
- plugins Expo revisados porque modifican proyectos nativos;
- firma/store credentials en EAS o vault aprobado;
- builds reproducibles en perfil controlado y artefactos inmutables.

## Privacidad

Antes de analytics/crash reporting se define inventario de eventos, propósito, retención, región,
consentimiento y borrado. Device ID, advertising ID, ubicación y contactos no se recolectan por
conveniencia.

## Pruebas negativas

Sesión expirada, dispositivo offline, deep link hostil, permiso revocado, archivo malicioso, build
antiguo y telemetría con payload sensible. Un pentest externo no se declara hasta tener informe y
alcance verificables.

## Definition of Done

Threat model actualizado, datos clasificados, controles probados, dependencias escaneadas y plan de
respuesta/rotación documentado.

> Fuente única para **Correcto / Incorrecto: revisión 2026**: [abrir documento canónico](../../../../governance/documentation-dry-and-ownership.md).

### ✅ Correcto / ❌ Incorrecto — Seguridad, Hardening Y Privacidad Mobile

✅ **Correcto:** Para **Seguridad, Hardening Y Privacidad Mobile**, verificar autorización por recurso y aislar secretos de los logs.

❌ **Incorrecto:** En **Seguridad, Hardening Y Privacidad Mobile**, confiar en la UI o en el tenant_id enviado por el cliente.
