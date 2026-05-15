# Preflight de servicios y preparación de pruebas E2E — Vigilio 2026

**Owner:** `standards/testing/`. **Estado:** plantilla portable entregada; requiere configuración y pruebas en cada consumidor.

## Antes de E2E

- Preparar `scripts/vigilio-services-check.sh` por proyecto mediante plantilla o init no destructivo. Revisar las variables de entorno sin registrar sus valores secretos.
- Comprobar solo los servicios que correspondan: PostgreSQL (`pg_isready` para puerto; `psql -X -w SELECT 1` con variables `PG*` para autenticación cuando se exige), Redis/Valkey (`redis-cli PING`), HTTP (`curl` con health URL) y AWS (`aws sts get-caller-identity`, bucket o cola explícitos). Ausencia de herramienta o endpoint → `NOT_RUN` cuando está realmente deshabilitado, **`BLOCKED` y exit 2 cuando se configuró el servicio o es obligatorio**, nunca `PASS`. Un `FAIL` produce exit 1.
- E2E depende de: servicios listos, migraciones verificadas sin ejecutarlas automáticamente, datos de prueba aislados, permisos de entorno, test runner existente, credenciales bajo secretos y plan de limpieza.
- El script es **read-only**: no crea recursos AWS, no ejecuta migraciones, no modifica producción y no ejecuta pruebas por su cuenta.
- No inspeccionar bases productivas sin autorización; usar entornos efímeros o de test, datos sintéticos y cuentas de mínimo privilegio.

## Ejemplo portable para consumidores

```bash
# Ejecutar desde la raíz del proyecto consumidor
bash scripts/vigilio-services-check.sh
# En CI: preparar servicios aislados y luego ejecutar tests EXISTENTES del stack
# PostgreSQL: PGHOST, PGPORT, opcional PGUSER/PGDATABASE, sin imprimir PGPASSWORD.
# Redis: REDIS_HOST/REDIS_PORT, REDISCLI_AUTH opcional; HTTP: HTTP_HEALTH_URL
# AWS: AWS_CHECK=1, VIGILIO_S3_BUCKET/VIGILIO_SQS_QUEUE_URL opcionales; `VIGILIO_REQUIRE_PG/REDIS/HTTP/AWS=1` para exigir disponibilidad; `VIGILIO_REQUIRE_PG_SQL=1` o `VIGILIO_PG_SQL_CHECK=1` para exigir autenticación SQL
```

| Evidencia | Resultado |
|---|---|
| Herramienta presente + servicio responde | `PASS` |
| Servicio configurado y falla | `FAIL` |
| Servicio no configurado | `NOT_RUN` |
| Servicio requerido pero sin credenciales/permiso | `BLOCKED` (en reporte de CI) |

✅ Correcto: habilitar gates E2E específicos del stack después de preflight. ❌ Incorrecto: imprimir tokens, ejecutar migraciones como «health check» o declarar `PASS` por un `docker ps`.

Cuando un servicio es obligatorio para E2E, exportar `VIGILIO_REQUIRE_PG=1`, `VIGILIO_REQUIRE_REDIS=1`, `VIGILIO_REQUIRE_HTTP=1` o `VIGILIO_REQUIRE_AWS=1`; estado `BLOCKED` devuelve exit 2. `NOT_RUN` sin flags de obligatoriedad no es `PASS`, ni autoriza afirmar que un servicio está listo.

## Controles negativos y SQL obligatorio (actualización de seguridad)

- **No equiparar** `pg_isready` con autenticación, existencia de esquema o migraciones completas. `PGDATABASE` debe estar configurado para la verificación SQL.
- `VIGILIO_PG_SQL_CHECK=1` **requiere** `psql` y `SELECT 1` autenticado. Si falta el CLI, la base o las credenciales: `BLOCKED` o `FAIL`, con salida distinta de cero. `VIGILIO_REQUIRE_PG_SQL=1` tiene la misma obligación.
- `VIGILIO_PG_SCHEMA=public` permite verificar existencia de esquema usando SQL de solo lectura, después de autenticar. `VIGILIO_PG_MIGRATION_TABLE=public.__drizzle_migrations` verifica únicamente existencia de la tabla declarada; **no certifica versión ni ejecución correcta de migraciones**. No fijar esa tabla si el proyecto usa una distinta.
- Los identificadores para esquema/tabla deben superar la validación de entrada; el script rechaza caracteres de SQL no permitidos.
- Antes de E2E se debe **consultar la tabla real de migraciones, versión esperada, permisos y fixtures** con checks del stack y sin migrar automáticamente. Redis, IAM y HTTP se comprueban según el contexto requerido; una comprobación omitida nunca prueba disponibilidad.
- Probar con `node vigilio-skills/scripts/test-security-boundaries.mjs` los casos: SQL obligatorio sin `psql`, SQL fallido, esquema inválido, symlinks en el bootstrap e idempotencia. La prueba offline **no** sustituye PostgreSQL ni AWS reales.
- El instalador rechaza symlinks en los destinos administrados y valida todo el plan antes de escribir; conserva los scripts y reglas que el consumidor ya tenía. No garantiza aislamiento ante un atacante que cambie el filesystem concurrentemente: ejecutar la instalación en un workspace de confianza.

## Evidencia de CI/PR en consumidores

La plantilla no destructiva de workflow vive en `vigilio-skills/assets/templates/project/.github/workflows/vigilio-pr-quality.example.yml`. Es un **ejemplo opt-in** para Node/Nest; copiar, adaptar los comandos del stack real, habilitar secrets de sandbox, aprobar dependencias del runner y configurar required checks/branch rules en GitHub. Ningún archivo de ZIP activa el workflow ni las reglas de la plataforma automáticamente. Code review de IA es un control adicional; los checks deterministas deben ejecutarse de forma independiente y nunca marcar `PASS` si no se ejecutaron.
