# ADR 0002 - Refresh tokens con rotacion y estado en base de datos

## Estado

Aceptado. Supersede la implementacion original de refresh sin estado.

## Contexto

La primera version emitia refresh tokens como JWT puros, sin estado en servidor. `POST /auth/refresh`
verificaba la firma, comprobaba que el usuario siguiera activo y emitia un par nuevo.

Eso tiene tres consecuencias que no son aceptables en una plantilla que va a heredar todo proyecto
derivado:

1. **No se puede revocar.** Un refresh token robado es valido durante los 7 dias completos de su TTL.
   `logout` no puede hacer nada porque no hay nada que invalidar.
2. **No se puede rotar el secreto.** Cambiar `JWT_SECRET` invalida las sesiones de todos los usuarios a
   la vez, asi que en la practica nunca se rota. La supresion `AwsSolutions-SMG4` en CDK reconocia esto
   dejando la rotacion "al runbook", es decir, a nadie.
3. **No se detecta el robo.** Si un atacante copia un refresh token, lo usa en paralelo con el usuario
   legitimo y nadie se entera.

## Decision

Cada refresh token emitido se registra en la tabla `auth_sessions` con su `jti`, un `family_id` que
agrupa todos los tokens derivados del mismo login, y el hash SHA-256 del token.

En cada `POST /auth/refresh`:

1. Se revoca la sesion actual con `UPDATE ... WHERE jti = ? AND revoked_at IS NULL RETURNING id`.
   La condicion hace la operacion **atomica**: ante dos peticiones concurrentes con el mismo token,
   exactamente una recibe fila.
2. Si no devuelve fila, el token ya estaba revocado. Eso solo puede pasar por reuso, asi que se revoca
   la **familia completa** y se registra en el log a nivel `error`.
3. Si devuelve fila, se emite un par nuevo conservando el `family_id`.

Se guarda el hash del token, nunca el token. Un volcado de la tabla no entrega credenciales usables.

Esto implementa la rotacion con deteccion de reuso descrita en OAuth 2.0 Security Best Current
Practice (RFC 9700).

## Consecuencias

Beneficios:

- `logout` y `logout-all` funcionan de verdad.
- El robo de un refresh token se detecta en el primer uso concurrente y cierra la sesion completa.
- Un usuario desactivado pierde sus sesiones en el siguiente refresh, no al expirar el token.
- Permite rotar `JWT_SECRET` por etapas sin invalidar a todo el mundo a la vez.

Costos y deuda aceptada:

- Cada refresh escribe en la base de datos. Deja de ser una operacion puramente criptografica.
- La tabla crece y necesita purga. `purgeExpired` existe pero **todavia no hay un job que la invoque**;
  hoy depende de ejecucion manual. Es la deuda conocida de esta decision.
- El access token sigue siendo sin estado a proposito: validarlo contra la base en cada peticion
  anularia la ventaja del JWT. La ventana de exposicion de un access token robado sigue siendo su TTL
  de 15 minutos.

## Alternativas consideradas

- **Mantener refresh sin estado.** Descartada: los tres problemas de arriba son inherentes.
- **Denylist de `jti` en vez de tabla de sesiones.** Descartada: resuelve la revocacion pero no la
  deteccion de reuso, que necesita el linaje que aporta `family_id`.
- **Sesiones en Redis o ElastiCache.** Descartada por ahora: anade una dependencia de infraestructura y
  coste fijo para un volumen que PostgreSQL absorbe sin esfuerzo. Reconsiderar si el refresh se vuelve
  un punto caliente medible.
- **Cookies `HttpOnly` en vez de tokens en el cliente.** Sigue siendo el objetivo para datos sensibles,
  pero es un cambio cross-repo (CORS, CSRF, `web-mfe`) y se trata por separado.

## Fecha

2026-07-26

## Owners

- Equipo: Plataforma
- Responsable: owner de `bus-impl`
