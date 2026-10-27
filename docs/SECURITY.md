# Seguridad y modelo de amenazas

- Autenticación: OpenID Connect Authorization Code + PKCE con Keycloak; sin passwords ni refresh tokens enviados a nuestra API. Keycloak administra registro, verificación de email, reset, MFA, Google y Facebook; conectar proveedores requiere credenciales reales, URLs autorizadas, revisión de permisos y políticas de proveedor. El navegador maneja tokens de acceso en sessionStorage (mejor que localStorage persistente pero todavía expuestos ante XSS); endurecer CSP y evaluar BFF + HttpOnly cookies/CSRF antes de producción.
- API: JOSE comprueba firma JWKS, `issuer`, `aud=enterprise-rag-api`, `azp=enterprise-rag-web`, vencimiento. JWT falso/expirado no otorga acceso.
- Autorización: PostgreSQL RLS con actor sub de JWT por transacción. `can_read_document()` acepta solo propietario o documento de tenant compartido con usuario miembro. Los documentos privados NO son visibles automáticamente para admins de tenant. `knowledge_bases` solo visibles por miembros del tenant. CRUD no usa raw tenant headers.
- Fail closed: `app.actor_sub` vacío por defecto. La conexión API de DB usa rol `rag_app` sin `BYPASSRLS` ni ownership; SQL migration con rol admin. Si se altera migración de RLS, correr negativos cross-user/tenant.
- Prompt injection: texto de documentos solo se trata como datos, delimitado en prompt; no se habilitan tools. No es protección infalible; ejecutar dataset adversarial antes de producción.
- Límites: ingesta de texto plano máximo 100 KB y 100 documentos por base en slice inicial. No hay subida binaria: PDFs y malware scanner pendientes.
- El entorno de desarrollo usa Mailpit como SMTP de pruebas para password recovery y verificación; producción requiere SMTP seguro real; Google y Facebook se configuran como identity providers en realm; sin credenciales no funcionan, UI no debe presentarlos como configurados por defecto.
- No almacenar raw prompts ni tokens en logs. No publicar Keycloak admin, PostgreSQL u Ollama en internet. Dev expone Keycloak en loopback para pruebas, no producción.

## Bloqueantes de producción

CSP y protección anti-XSS auditadas, rate limiting per actor/IP, workflows de revocación de token, ACL por usuario/grupo en el mismo tenant, políticas completas RLS sobre nuevas tablas, sesiones BFF HttpOnly, backups PITR reales, failover/monitoring, escaneo de uploads y supply chain firmas. Los tests existentes no prueban todos estos controles.
