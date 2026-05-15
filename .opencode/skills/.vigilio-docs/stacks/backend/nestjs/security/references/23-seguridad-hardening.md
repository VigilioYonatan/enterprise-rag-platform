# Seguridad y Hardening Senior - `bus-impl`

Este checklist complementa DevSecOps. No es teoria: son controles que deben quedar visibles en PR, CI o runtime.

## 1. Entrada HTTP

- Validar `body`, `query` y `params` con Zod.
- Rechazar payloads grandes con limite explicito por endpoint.
- Usar `@Public()` solo cuando el endpoint sea realmente anonimo.
- Documentar permisos por endpoint: publico, autenticado, rol, policy ABAC.
- Nunca confiar en headers de cliente para tenant, usuario o rol sin validacion del auth layer.

## 2. Autenticacion y autorizacion

- AuthN en guard global.
- AuthZ por policy, no solo por rol plano.
- `@Public()` debe ser excepcion visible en code review.
- Endpoints administrativos deben requerir MFA o claims fuertes si aplica.
- Auditar acciones mutables: create, update, destroy, approve, cancel.

## 3. Rate limit y abuso

- Rate limit por IP, usuario, tenant y endpoint critico.
- Backoff o captcha solo en canales publicos si aplica.
- Proteger endpoints de busqueda con limites maximos y paginacion.
- Evitar `limit` sin maximo; usar `querySchema.limit.max(100)`.

## 4. Datos sensibles

- Clasificar campos: publico, interno, confidencial, PII, secreto.
- No loguear tokens, cookies, passwords, payloads completos ni documentos.
- Pino debe usar redaction para `authorization`, `cookie`, `set-cookie`, `password`, `token`.
- En responses, usar DTOs publicos con `pick/omit`; no devolver rows completas por accidente.

## 5. Persistencia

- Drizzle con queries tipadas y parametros, no SQL string concatenado.
- Transacciones para cambios multi-tabla.
- Idempotency key para endpoints que pueden reintentarse.
- Constraints en DB: unique, foreign keys, check, not null.
- Migrations expand-contract para cambios incompatibles.

## 6. Secrets

- Secrets en AWS Secrets Manager o SSM Parameter Store con KMS.
- No secrets en `.env.example`, logs, tests ni fixtures.
- Rotacion documentada.
- IAM least privilege por Lambda/service.
- GitHub Actions usa OIDC, no access keys estaticas.

## 7. Supply chain

- `pnpm install --frozen-lockfile`.
- `minimumReleaseAge`, `trustPolicy`, `strictDepBuilds` y `allowBuilds`.
- `pnpm audit --audit-level=high` y Trivy; Dependency Review cuando GHAS este disponible.
- Gitleaks/secret scanning en PR.
- CodeQL y Trivy como gates.
- Paquetes privados `@<organization>/*` vía GitHub Packages con
  `packages: read`.

## 8. Observabilidad segura

- Correlation ID obligatorio.
- Logs estructurados sin PII.
- Metricas por endpoint: latencia, errores, rate limited, auth denied.
- Alertas por spike de 401/403/429/5xx.
- Dashboard por SLO y error budget.

## 9. Resiliencia

- Timeouts por llamada externa.
- Retries solo idempotentes.
- Circuit breaker para proveedores lentos.
- DLQ para consumidores async.
- Outbox para eventos de dominio.
- Replay auditado, no manual sin trazabilidad.

## 10. Incident response

- Runbook por incidente: secrets leak, auth bypass, data leak, dependency CVE, DB corruption.
- Capacidad de revocar tokens y rotar secrets.
- Feature flags para apagar endpoints riesgosos.
- Evidencia: logs, traces, deploy SHA, artifact, SBOM.

## Definition of Done de seguridad

Un PR sensible esta listo si:

- DTOs Zod validan entrada y response.
- AuthZ esta documentada.
- No hay secrets ni PII en logs.
- Tests cubren caso permitido y denegado.
- OpenAPI no expone campos internos.
- Scalar no carga scripts, estilos, fuentes ni branding desde CDN; todos sus assets son del mismo origen.
- La CSP de Scalar usa nonce por respuesta y nunca `unsafe-inline` en `script-src`.
- Las docs estan deshabilitadas por defecto en produccion o protegidas por un control de acceso explicito.
- CI pasa lint, typecheck, tests, security scans y package policy.

> Fuente única para **Correcto / Incorrecto: revisión 2026**: [abrir documento canónico](../../../../../governance/documentation-dry-and-ownership.md).

### ✅ Correcto / ❌ Incorrecto — Seguridad y Hardening Senior - `bus-impl`

✅ **Correcto:** Para **Seguridad y Hardening Senior - `bus-impl`**, verificar autorización por recurso y aislar secretos de los logs.

❌ **Incorrecto:** En **Seguridad y Hardening Senior - `bus-impl`**, confiar en la UI o en el tenant_id enviado por el cliente.
