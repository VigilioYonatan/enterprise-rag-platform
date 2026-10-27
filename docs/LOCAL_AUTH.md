# Autenticación Keycloak local

1. Arranca Compose. Keycloak importa realm `enterprise` con cliente público `enterprise-rag-web`, PKCE S256, registration, resetPassword, verifyEmail y bruteForceProtected.
2. Accede al login desde web; el registro puede requerir correo verificable. En desarrollo configura SMTP real (Mailpit para ver correos localmente solo si se incorpora explícitamente) o crea usuario desde consola y marca correo verificado. No hay credenciales de usuario precargadas.
3. En desarrollo el realm utiliza **Mailpit** (bandeja `http://localhost:8025`) con SMTP `mailpit:1025`, por lo que la verificación de email y el reset funcionan sin correo externo. Nunca usar Mailpit como servicio de producción.
4. Google: Console Google OAuth crea cliente web y callback `http://localhost:8081/realms/enterprise/broker/google/endpoint`. Configura identity provider alias `google` en el realm, client ID/secret. Agrega URI segura de producción apropiada.
5. Facebook: Meta for Developers crea Facebook Login (OAuth) y callback `http://localhost:8081/realms/enterprise/broker/facebook/endpoint`; configura identity provider alias `facebook` y App ID/secret. Meta puede requerir verificación/aprobación de aplicación. No confundir Facebook OAuth con proveedor OIDC universal.
6. SMTP: Realm settings → Email; activa servidor propio y TLS. Login → Forgot password envía enlace de un solo uso desde Keycloak; verificación de correo y expiración son gestionados allí.
7. MFA: Authentication → Required actions → Configure OTP; exige configuración y políticas según nivel de riesgo.

⚠️ Los botones Google/Facebook de la web usan `kc_idp_hint`, pero deben ocultarse si sus identity providers aún no están configurados. Configuración mediante `VITE_GOOGLE_ENABLED`/`VITE_FACEBOOK_ENABLED` tras activar realmente cada broker.

**Producción:** Keycloak requiere dominio HTTPS, correctos redirect origins/hostname, secretos fuera de Git, backups de identidad y endurecimiento de reverse proxy. La URL local no es configuración productiva.
