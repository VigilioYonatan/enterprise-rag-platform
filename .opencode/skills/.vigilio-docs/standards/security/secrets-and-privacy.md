# Secretos, privacidad y logging seguro (compartido)

## Modelo de riesgo

Secrets, tokens, datos personales, URLs presigned, cuerpos con contraseñas y columnas privadas no deben registrarse ni persistirse en sistemas de observabilidad por defecto. Minimizar tiempos de retención y aislar entornos. Preferir identidades de workload/OIDC a credenciales de larga duración.

✅ Correcto: logs estructurados con `requestId`, `traceId`, nombre de operación, duración y códigos de error **sin PII**, con redacción por defecto; secretos cargados de un proveedor seguro y rotación probada.

❌ Incorrecto: `logger.info({query, body, authorization: req.headers.authorization})` o volcar secretos al contexto de agentes, respuestas o CI.

## Gates

- Inventario de datos y clasificación; revisión de flujos hacia logs, colas, caché y backups.
- Scanners de secretos/SBOM/dependencias; IAM/Pod Identity/secret manager; rotación y permisos mínimos.
- TLS, cifrado de datos, políticas de expiración y borrado verificables.
- Revisión de endpoints públicos antes de usar `@Public`, rutas Laravel sin middleware o esquemas OpenAPI públicos.
- Logs y traces deben usar atributos permitidos y cardinalidad baja.

Reglas compartidas aplicables a NestJS/Laravel; frameworks solo cambian los adapters. [Autorización](authorization.md).

## Procedencia documental preservada

- [Capítulo heredado: 12-authz-security.md](../../stacks/backend/nestjs/security/references/12-authz-security.md) — contenido íntegro conservado.
- [Capítulo heredado: 13-data-governance.md](../data/references/13-data-governance.md) — contenido íntegro conservado.
- [Capítulo heredado: 23-seguridad-hardening.md](../../stacks/backend/nestjs/security/references/23-seguridad-hardening.md) — contenido íntegro conservado.

> Fuente única para **Cobertura de implementación y evidencia (ampliación)**: [abrir documento canónico](../../governance/complete-work-coverage-policy.md).

