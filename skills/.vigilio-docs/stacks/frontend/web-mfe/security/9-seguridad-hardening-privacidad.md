# Seguridad, Hardening Y Privacidad Frontend

## Modelo de confianza

Todo código y configuración enviados al navegador son públicos. La validación frontend mejora UX; autorización, integridad y reglas de negocio permanecen en backend.

## Configuración y secretos

- Allowlist de variables públicas.
- HTTPS fuera de localhost.
- Sin secretos en Vite env, runtime config, bundles o source maps públicos.
- Rechazar nombres sensibles durante governance.
- GitHub Actions obtiene AWS mediante OIDC.

## Sesión

Objetivo recomendado para información sensible:

- cookies `HttpOnly`, `Secure`, `SameSite`;
- CSRF explícito;
- refresh rotation y revocación;
- logout consistente;
- no persistir tokens legibles por JavaScript.

Si existe una transición con `sessionStorage`, registrarla como riesgo y limitar exposición. Nunca usar `localStorage` por comodidad para credenciales de larga duración.

## XSS y DOM

- No usar `dangerouslySetInnerHTML` con contenido no confiable.
- No construir URLs/HTML desde payloads sin validación.
- Sanitizar en el boundary exacto cuando el requisito lo exija.
- No mostrar stack traces, Zod issues ni mensajes internos.
- Tratar Markdown/IA como contenido no confiable.

## Headers CDN

- CSP sin `unsafe-eval` ni wildcards amplios.
- `frame-ancestors 'none'` o política justificada.
- `object-src 'none'`, `base-uri` y `form-action` restringidos.
- HSTS en HTTPS.
- `X-Content-Type-Options: nosniff`.
- Referrer Policy.
- Permissions Policy.
- `X-Robots-Tag` para backoffice/previews privados.

Las excepciones CSP deben estar documentadas y probadas. Preferir nonce/hash a ampliar orígenes indiscriminadamente.

## Uploads

- MIME, tamaño y purpose validados en cliente y servidor.
- Presigned URL corta y con key controlada por backend.
- No confiar en extensión de archivo.
- No exponer buckets ni metadata interna innecesaria.
- Escaneo/validación posterior según clasificación del archivo.

## IA

- Redactar PII y secretos.
- Limitar tamaño, frecuencia y costo.
- Cancelación y timeout.
- Guardrails y autorización backend.
- No registrar prompts/responses completos por defecto.

## Supply chain

- Lockfile congelado.
- Versiones exactas para herramientas y contratos externos.
- Actions fijadas por SHA.
- Dependency review, audit, SAST y secret scan.
- SBOM por release.
- Lifecycle scripts nuevos requieren revisión.
- Excepciones de seguridad tienen owner y expiración.

## Datos y telemetría

Clasificar antes de instrumentar. Redactar:

- tokens y cookies;
- emails, documentos e identificadores personales;
- bodies y query params;
- prompts y archivos;
- URLs firmadas.

Aplicar sampling, retención y acceso mínimo. Grafana no recibe credenciales desde el browser.

## Pruebas negativas

- runtime config con variable sensible;
- response contractual incompatible;
- sesión expirada;
- upload fuera de límite;
- HTML/URL no confiable;
- headers faltantes en ambiente desplegado;
- artifact con `.env` o source maps no autorizados.

## Definition of Done

- Threat model/OpenSpec actualizado cuando cambia el riesgo.
- Ningún secreto llega al cliente o artifact.
- CSP/headers sintetizados y verificados.
- Logs y telemetría sin PII.
- Scans y gates relevantes verdes.
- Riesgos aceptados tienen owner, justificación y expiración.

> Fuente única para **Correcto / Incorrecto: revisión 2026**: [abrir documento canónico](../../../../governance/documentation-dry-and-ownership.md).

### ✅ Correcto / ❌ Incorrecto — Seguridad, Hardening Y Privacidad Frontend

✅ **Correcto:** Para **Seguridad, Hardening Y Privacidad Frontend**, verificar autorización por recurso y aislar secretos de los logs.

❌ **Incorrecto:** En **Seguridad, Hardening Y Privacidad Frontend**, confiar en la UI o en el tenant_id enviado por el cliente.
