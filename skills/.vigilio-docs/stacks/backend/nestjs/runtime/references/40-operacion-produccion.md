# Operacion de produccion

## Endpoints operativos

| Endpoint | Dependencia | Uso |
| --- | --- | --- |
| `GET /health` | Ninguna | Liveness: confirma que el proceso responde. |
| `GET /ready` | PostgreSQL | Readiness: ejecuta `select 1`; responde `503` si la base no esta lista. |

No agregues S3, Bedrock ni APIs externas a liveness. Readiness representa solo dependencias necesarias para atender el trafico base.

## Autorizacion

| Recurso | Lectura | Escritura |
| --- | --- | --- |
| Usuarios | `admin` | `admin` |
| Productos | cualquier usuario autenticado | `admin`, `operador` |
| Products | publico | `admin`, `operador` |
| Upload e IA | cualquier usuario autenticado | aplica al endpoint |

`JwtAuthGuard` autentica primero y `RolesGuard` autoriza despues. Declara reglas nuevas con `@Roles(...)`; una ruta publica siempre usa `@Public()` explicitamente.

## Base de datos

```bash
pnpm db:local:setup
pnpm db:local:reset
pnpm db:restore:drill
```

Las migraciones usan `drizzle-orm/node-postgres/migrator` y el journal de `drizzle/meta`. Nunca edites una migracion aplicada: genera una nueva con `pnpm drizzle:generate` y valida con `pnpm drizzle:check`.

`db:restore:drill` reutiliza PostgreSQL con Podman o Docker, crea `bus_impl_restore_drill`, valida datos restaurados y elimina la copia. En staging/production, ejecuta tambien un restore administrado de RDS en una VPC aislada antes de aprobar cambios destructivos o de backup.

## Rendimiento

```bash
pnpm test:load
pnpm test:soak
```

Variables: `LOAD_BASE_URL`, `LOAD_DURATION_SECONDS`, `LOAD_CONCURRENCY`, `LOAD_MAX_ERROR_RATE`, `LOAD_MAX_P95_MS`. El smoke usa 15 segundos, concurrencia 10, error maximo 1% y P95 maximo 750 ms. Ajusta umbrales por SLO, no para hacer pasar una ejecucion.

## Alertas

CDK publica errores, throttling, duracion P95, HTTP 5XX y latencia P95 en un topic SNS cifrado. Define `ALERT_EMAIL` al desplegar y confirma la suscripcion enviada por AWS:

```bash
ALERT_EMAIL=oncall@example.com pnpm cdk:deploy:production
```

Las alarmas operativas notifican estados `ALARM` y `OK`. En production, las alarmas de deployment tambien activan rollback de CodeDeploy.

## Gate minimo

```bash
pnpm lint
pnpm typecheck
pnpm test:coverage
pnpm test:integration
pnpm test:bdd
pnpm test:e2e:api
pnpm db:restore:drill
pnpm cdk:synth -- --context stage=development
```

No desplegar si readiness, restore, RBAC negativo, migraciones o synth fallan.

> Fuente única para **Correcto / Incorrecto: revisión 2026**: [abrir documento canónico](../../../../../governance/documentation-dry-and-ownership.md).

### ✅ Correcto / ❌ Incorrecto — Operacion de produccion

✅ **Correcto:** Para **Operacion de produccion**, separar configuración y secretos por ambiente, probar arranque y healthchecks.

❌ **Incorrecto:** En **Operacion de produccion**, hardcodear secretos o prometer despliegue sin pruebas en runtime.
