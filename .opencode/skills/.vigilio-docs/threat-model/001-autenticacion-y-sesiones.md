# Threat Model - Autenticacion y sesiones

Flujo de `bus-impl`: registro, login con contrasena, login con Google, refresh, logout.
Refleja el estado del codigo tras los ADR [0002](../adr/0002-refresh-token-rotacion-con-estado.md),
[0003](../adr/0003-rate-limiting-en-postgresql.md) y
[0005](../adr/0005-sin-dependencias-para-cabeceras-de-seguridad.md).

## Flujo

```text
cliente -> POST /auth/login            -> valida credenciales -> emite access + refresh
cliente -> POST /auth/refresh          -> rota refresh (revoca el anterior) -> emite par nuevo
cliente -> POST /auth/logout           -> revoca la sesion presentada
cliente -> POST /auth/logout-all       -> revoca todas las sesiones del usuario (requiere access token)
cliente -> Authorization: Bearer <at>  -> JwtAuthGuard global valida access token
```

## Actores

- **Usuario legitimo**: posee credenciales o cuenta Google vinculada.
- **Atacante sin credenciales**: prueba combinaciones contra `/auth/login`.
- **Atacante con un token robado**: obtuvo un access o refresh token via XSS, dispositivo compartido
  o interceptacion.
- **Google**: emisor de `id_token` en el login federado. Se le delega la verificacion de identidad.

## Datos sensibles

| Dato | Clasificacion | Retencion |
| --- | --- | --- |
| Contrasena | Restricted | Nunca en claro. Hash scrypt con sal por usuario. |
| Refresh token | Restricted | Solo el hash SHA-256 en `auth_sessions`. TTL 7 dias. |
| Access token | Restricted | Nunca persistido en servidor. TTL 15 minutos. |
| Email | Confidential | Mientras exista la cuenta. Redactado en logs. |
| IP y user agent | Internal | En `auth_sessions` y `auth_login_attempts` para auditoria. |

## STRIDE

| Categoria | Riesgo concreto | Control |
| --- | --- | --- |
| **Spoofing** | Fuerza bruta o credential stuffing contra `/auth/login`. | 5 intentos por email y 20 por IP en ventana de 15 min, con estado en PostgreSQL para que funcione en Lambda (`auth.application-service.ts`). |
| **Spoofing** | Enumeracion de cuentas por diferencia de tiempo de respuesta. | Se verifica siempre un hash scrypt, contra un valor senuelo si el email no existe. Mensaje de error identico en ambos casos. |
| **Spoofing** | Falsificar `X-Forwarded-For` para esquivar el limite por IP. | `request.ip` resuelto por Express con `trust proxy` = `TRUSTED_PROXY_HOPS`. No se lee la cabecera a mano. |
| **Spoofing** | `id_token` de Google falsificado o de otra aplicacion. | `GoogleIdTokenVerifier` valida firma, issuer y `aud` contra `GOOGLE_CLIENT_ID`. |
| **Tampering** | Alterar el payload del JWT para escalar rol. | Firma HS256 verificada con `algorithms: ["HS256"]` explicito, lo que bloquea el ataque `alg: none` y la confusion de algoritmo. `issuer` y `audience` verificados. |
| **Repudiation** | Un usuario niega una accion realizada con su sesion. | `auth_sessions` guarda IP, user agent y timestamp por sesion. Logs con `action` y `user_id`, correlacionados por `x-correlation-id`. |
| **Information disclosure** | Tokens o contrasenas en los logs. | `redact` de Pino elimina `authorization`, `cookie`, `body.password` y `body.token`. El log de fallo registra solo el dominio del email, no el email. |
| **Information disclosure** | Volcado de la tabla de sesiones entrega tokens usables. | Se guarda `sha256(token)`, nunca el token. |
| **Information disclosure** | Respuesta JSON interpretada como HTML en el navegador. | `nosniff`, CSP `default-src 'none'` y `Cross-Origin-Resource-Policy: same-origin`. |
| **Denial of service** | Bloqueo dirigido: un atacante bloquea el login de un usuario conocido. | **Riesgo aceptado.** Ver riesgo residual. |
| **Denial of service** | Volumen de intentos fallidos infla `auth_login_attempts`. | Indices por `(email, attempted_at)` e `(ip_address, attempted_at)`. `purgeExpired` limpia la tabla. |
| **Elevation of privilege** | Usar un refresh token como access token. | El payload lleva `typ` y `verify()` exige el tipo esperado. |
| **Elevation of privilege** | Reutilizar un refresh token robado. | Rotacion con deteccion de reuso: la revocacion es atomica (`WHERE revoked_at IS NULL`) y un segundo uso revoca la **familia completa** (RFC 9700). |
| **Elevation of privilege** | Endpoint nuevo publico por olvido. | `JwtAuthGuard` es global (`APP_GUARD`). Un endpoint es privado salvo `@Public()` explicito. |

## Controles obligatorios

- **AuthN**: scrypt con sal por usuario y `timingSafeEqual`; Google OIDC con verificacion de `aud`.
- **AuthZ**: `JwtAuthGuard` + `RolesGuard` globales; `@Public()` explicito y revisable.
- **Audit**: `auth_sessions` con IP, user agent y motivo de revocacion; logs correlacionados.
- **Rate limit**: por email y por IP con estado compartido.
- **Validacion**: Zod en todos los DTOs de entrada, via `ZodValidationPipe` global.
- **Logging**: sin PII ni secretos; reuso de refresh registrado a nivel `error`.

## Riesgo residual

1. **Access token robado sigue siendo valido hasta 15 minutos.** No se valida contra la base en cada
   peticion a proposito: anularia la ventaja del JWT. Se acepta y se acota con el TTL corto.
   *Revision: si aparece un caso de uso con datos de mayor criticidad.*

2. **Bloqueo dirigido por email.** Quien conozca un email puede bloquear ese login 15 minutos. Es el
   compromiso clasico del control. Se acepta porque no limitar es peor.
   *Mitigacion pendiente: rate limiting en WAF y backoff progresivo en vez de umbral duro.*

3. **Tokens en almacenamiento accesible por JavaScript en el cliente.** `web-mfe` los guarda en
   `sessionStorage`, legible por XSS. El objetivo es cookie `HttpOnly` + `Secure` + `SameSite`, pero
   es un cambio cross-repo (CORS, CSRF, frontend).
   *Revision: antes de manejar datos de salud reales.*

4. **`purgeExpired` no tiene job programado.** La limpieza de sesiones e intentos existe pero hoy
   requiere ejecucion manual.
   *Accion: programar como tarea recurrente.*

5. **`/auth/register` y `/ai-chat/messages` sin limite de aplicacion.** Solo estarian protegidos por
   API Gateway y WAF, que hoy no tienen reglas de rate limiting configuradas.
   *Accion: anadir reglas de throttling en CDK.*

6. **Rotacion de `JWT_SECRET` no automatizada.** La supresion `AwsSolutions-SMG4` sigue vigente. Con
   sesiones con estado la rotacion por etapas ya es posible, pero no esta implementada.
   *Accion: rotacion dual con `kid` en el header del JWT.*

## Fecha

2026-07-26

## ✅ Correcto / ❌ Incorrecto: revisión 2026

- ✅ **Correcto:** AuthN + AuthZ de recurso/tenant; allowlist de salida, secretos fuera de logs y pruebas de acceso cruzado.
- ❌ **Incorrecto:** Permitir rutas públicas por comodidad, confiar sólo en `auth` o construir salida con `$request->all()`.
- **Al recibir código existente:** primero caracterizar el comportamiento, después refactorizar en pasos comprobables. [Guía canónica de modernización](../standards/engineering/refactoring-existing-code.md).
