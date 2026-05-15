# Integración BFF, HTTP, Runtime Y Autenticación

## Flujo

```text
bus-impl
  -> schemas request/response Zod
  -> @vigilioyonatan/bus-contracts
  -> ApiClient de web-mfe
  -> service de feature
  -> TanStack Query / Mutation
  -> componente
```

`bus-impl` es owner del contrato y de las reglas de negocio. El frontend es owner de interacción, estado visual y presentación.

## URL del backend

`VITE_API_BASE_URL` se resuelve desde runtime config. Fuera de localhost debe usar HTTPS. No hardcodear endpoints por ambiente en el bundle.

## Cliente HTTP

Un cliente central debe resolver:

- base URL normalizada;
- headers públicos y de sesión;
- `AbortSignal` y timeout;
- query params sin valores ambiguos;
- JSON y respuestas sin contenido;
- errores HTTP normalizados;
- validación Zod de responses;
- correlation ID.

Los componentes no llaman `fetch` o Amplify directamente. Los servicios conocen paths y contratos; los componentes conocen acciones del usuario.

## Correlación

Generar o propagar `X-Correlation-ID` por operación. Si el backend retorna un identificador equivalente, conservarlo para soporte y telemetría sin usarlo como identificador del usuario.

No registrar:

- tokens;
- bodies completos;
- documentos o prompts;
- emails, DNI u otra PII;
- URLs con query params sensibles.

## Errores

Separar cuatro categorías:

1. transporte, timeout o abort;
2. HTTP esperado (`401`, `403`, `404`, `409`, `422`, `429`);
3. incompatibilidad del contrato Zod;
4. error no controlado de UI.

La UI recibe un error seguro. Stack traces, Zod issues internos y detalles AWS permanecen fuera del mensaje al usuario.

## Autenticación

Estado de transición habitual:

- bearer token manejado por un store de sesión;
- refresh coordinado y logout explícito;
- limpieza de sesión frente a `401` no recuperable.

Objetivo para datos sensibles:

- cookie `HttpOnly`, `Secure` y `SameSite`;
- estrategia CSRF documentada;
- refresh rotation y revocación en backend;
- frontend sin acceso al token de sesión.

La migración de bearer token a cookie es cross-repo y requiere OpenSpec, cambios en `bus-impl`, CORS/CSRF, pruebas E2E y rollout compatible.

## Uploads

Los presigned uploads requieren límites de MIME, tamaño, purpose, expiración y autorización también en backend. El frontend no confía en `accept` como control de seguridad.

## IA generativa

- No enviar secretos ni contexto no aprobado.
- No renderizar HTML generado sin sanitización estricta.
- Aplicar límites, cancelación y feedback de errores.
- Redactar prompts/responses de telemetría.
- Mantener kill switch de runtime.

## Compatibilidad OpenAPI

El consumidor debe bloquear:

- endpoints requeridos ausentes;
- métodos HTTP incompatibles;
- contratos locales duplicados;
- imports NestJS/Node dentro del paquete browser-safe;
- breaking changes sin migración coordinada.

## Anti-patrones

- Parsear responses dentro de JSX.
- Hacer casts para esconder incompatibilidades.
- Guardar el mismo response en Query y Zustand.
- Acoplar componentes a headers o códigos internos.
- Conectar el navegador directamente a CloudWatch o Grafana con credenciales.

> Fuente única para **Correcto / Incorrecto: revisión 2026**: [abrir documento canónico](../../../../governance/documentation-dry-and-ownership.md).

### ✅ Correcto / ❌ Incorrecto — Integración BFF, HTTP, Runtime Y Autenticación

✅ **Correcto:** Para **Integración BFF, HTTP, Runtime Y Autenticación**, validar en el borde HTTP, preservar errores tipados y autorización.

❌ **Incorrecto:** En **Integración BFF, HTTP, Runtime Y Autenticación**, mezclar reglas de dominio con transporte HTTP o confiar solo en TypeScript.
