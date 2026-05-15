# HTTP, Autenticación, Deep Links Y Uploads

## Cliente HTTP

Existe una sola abstracción para base URL, timeout, correlation ID, bearer header, parseo Zod y
normalización de errores. El service de feature declara path/método/schema; no configura networking.

Cada request crea `x-correlation-id`. `traceparent` solo se envía si una instrumentación válida lo
genera; no se reutiliza el correlation ID como trace ID.

## Errores y cancelación

- `AbortSignal` cancela requests al abandonar una operación relevante.
- 401 intenta refresh una sola vez mediante coordinación central; evita tormentas paralelas.
- 403 conserva sesión y comunica falta de permiso.
- 422 se mapea a campos cuando el contrato lo permite.
- timeout/offline ofrece retry explícito.
- logs nunca incluyen bearer, refresh token, body sensible ni URL presignada.

## Sesión

Access y refresh token viven en SecureStore con accesibilidad limitada al dispositivo. Signals solo
expone estado de sesión. Logout borra ambos tokens, cancela requests, limpia query cache y vuelve al
boundary público. Biométricos protegen acceso local; no reemplazan autenticación del servidor.

## Deep links

Un link externo es input hostil. Se valida scheme/host/path/parámetros, se restaura sesión y luego se
autoriza el recurso. Redirect URIs OAuth se registran de forma exacta por ambiente; no se aceptan
comodines amplios.

## Upload presignado

```text
DocumentPicker -> validar nombre/MIME/tamaño
  -> POST /uploads/presigned-url
  -> PUT binario directo
  -> confirmación/estado backend
```

`expo-document-picker` devuelve URI y metadatos; `expo-file-system` crea el Blob/File compatible. Se
rechazan paths, MIME y tamaños fuera de allowlist antes de pedir la URL. El servidor vuelve a imponer
la política y la URL expira rápido. La app no recibe credenciales S3.

## Backend cloud-agnostic

La app no conoce si el backend usa AWS, Azure o GCP. Consume un contrato de upload y una URL temporal.
El provider cloud, bucket/container y Terraform permanecen detrás del backend.

## Pruebas negativas

- sesión ausente/expirada y refresh fallido;
- deep link malformado o no autorizado;
- picker cancelado y permiso denegado;
- MIME falso, archivo mayor al límite y URL expirada;
- PUT interrumpido, offline y retry no idempotente.

> Fuente única para **Correcto / Incorrecto: revisión 2026**: [abrir documento canónico](../../../../governance/documentation-dry-and-ownership.md).

### ✅ Correcto / ❌ Incorrecto — HTTP, Autenticación, Deep Links Y Uploads

✅ **Correcto:** Para **HTTP, Autenticación, Deep Links Y Uploads**, validar en el borde HTTP, preservar errores tipados y autorización.

❌ **Incorrecto:** En **HTTP, Autenticación, Deep Links Y Uploads**, mezclar reglas de dominio con transporte HTTP o confiar solo en TypeScript.
