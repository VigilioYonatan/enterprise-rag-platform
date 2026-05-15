# ADR 0003 - Rate limiting de autenticacion respaldado en PostgreSQL

## Estado

Aceptado

## Contexto

`POST /auth/login` no tenia ningun limite de intentos. Un atacante podia probar credenciales sin
freno contra `/auth/login`, `/auth/register` y `/auth/refresh`.

La respuesta habitual en NestJS es `@nestjs/throttler`, que por defecto guarda los contadores en
memoria del proceso. `bus-impl` despliega en **AWS Lambda**: cada invocacion puede caer en un
contenedor distinto y los contenedores se reciclan constantemente. Un contador en memoria ahi no
frena nada; da la apariencia de proteccion sin proteger, que es peor que no tener nada.

## Decision

Los intentos fallidos se registran en la tabla `auth_login_attempts` (email normalizado, IP, timestamp)
y se cuentan sobre una ventana deslizante de 15 minutos:

- 5 intentos fallidos por email
- 20 intentos fallidos por IP

Superado cualquiera de los dos, `/auth/login` responde `429` antes de comparar la contrasena. Un login
correcto limpia los intentos de ese email.

Ademas, el login verifica siempre un hash scrypt aunque el email no exista, contra un valor senuelo.
Sin eso, el tiempo de respuesta revela que cuentas estan registradas (enumeracion por temporizacion).

La IP se obtiene de `request.ip`, que depende de `trust proxy`. Ese valor se configura con
`TRUSTED_PROXY_HOPS` porque leer `X-Forwarded-For` a mano y quedarse con el primer valor seria
falsificable: cualquiera puede enviar esa cabecera y saltarse el limite por IP.

## Consecuencias

Beneficios:

- El limite funciona de verdad en serverless, porque el estado es compartido.
- El limite por email frena el ataque dirigido; el limite por IP frena el credential stuffing amplio.
- No anade dependencias ni infraestructura nueva.

Costos y deuda aceptada:

- Cada intento fallido escribe una fila. Un ataque de volumen alto genera escrituras; se acota con los
  indices por `(email, attempted_at)` e `(ip_address, attempted_at)` y con la purga.
- El bloqueo por email permite un **DoS dirigido**: un atacante que conozca el email de alguien puede
  bloquearle el login durante 15 minutos. Es el compromiso clasico de este control. Se acepta porque la
  alternativa (no limitar) es peor, pero conviene complementarlo con WAF a nivel de infraestructura.
- Este control **no cubre** `/auth/register` ni `/ai-chat/messages`, que siguen sin limite de aplicacion.
  Para esos, el control adecuado esta en API Gateway y WAF.

## Alternativas consideradas

- **`@nestjs/throttler` con almacen en memoria.** Descartada: inutil en Lambda.
- **`@nestjs/throttler` con almacen Redis.** Viable y mas eficiente, pero anade ElastiCache: coste fijo
  y una pieza mas que operar para un volumen que PostgreSQL absorbe. Reconsiderar si el volumen crece.
- **Solo rate limiting en API Gateway y WAF.** Necesario pero no suficiente: limita por IP, no por
  cuenta, asi que no frena un ataque distribuido contra un unico usuario. Los dos niveles son
  complementarios, no alternativos.

## Fecha

2026-07-26

## Owners

- Equipo: Plataforma
- Responsable: owner de `bus-impl`
