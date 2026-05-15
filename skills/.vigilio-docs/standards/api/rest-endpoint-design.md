# Diseño y arquitectura de endpoints HTTP — estándar Senior/Staff Vigilio 2026

**Estado:** estándar propuesto para endpoints nuevos; adopción de contratos existentes mediante migración compatible. **Ámbito:** NestJS, Laravel y demás backends HTTP. **Propietario:** `standards/api/`. **Revisión:** 2026-10-25.

Esta norma regula **el contrato externo REST/HTTP y el diseño operativo**. No sustituye [DTOs y Zod](http-dtos-and-contracts.md), [errores y paginación](http-errors-and-pagination.md), [seguridad por tenant](../security/tenant-isolation.md), [idempotencia/outbox](../messaging/outbox-idempotency.md), [naming y DDD](../engineering/naming-and-boundaries.md) ni las implementaciones por stack. Un proyecto existente conserva las interfaces publicadas hasta aprobar un cambio compatible o versionado. No cambiar endpoints heredados de manera indiscriminada.

## 1. Niveles y lenguaje normativo

- **DEBE / NO DEBE:** condición verificable cuando la operación aplica; omitirla requiere decisión documentada.
- **DEBERÍA:** recomendación por defecto que admite una justificación técnica.
- **SEGÚN EL CASO:** introducir solo si el riesgo, el negocio o las métricas lo requieren.
- **NUNCA** añadir una capa, un endpoint, una dependencia o un decorador solo para satisfacer una plantilla.

| Nivel | Controles | Política |
|---|---|---|
| **Base — toda API nueva** | semántica HTTP, recursos, request/response DTO, authN/authZ aplicable, tenant, estados/errores, límites, contrato OpenAPI, pruebas negativas y observabilidad mínima | **DEBE** |
| **Enterprise — por riesgo** | ETag/If-Match, idempotencia de comando, caché HTTP, auditoría, cuotas, filtrado avanzado, búsqueda, uploads | **SEGÚN EL CASO**, obligatorio si la operación presenta ese riesgo |
| **Distribuido — por necesidad** | cola, jobs, outbox, DLQ, webhooks, import/export, event-driven, saga/compensación | **SEGÚN EL CASO** con evidencia |

## 2. Contrato REST: métodos, rutas y semántica

| Método | Uso | Respuesta típica | Nota verificable |
|---|---|---|---|
| `GET /products` | lista o búsqueda sin mutación solicitada | `200` | seguro e idempotente; límites y autorización |
| `GET /products/{product_id}` | recurso identificable | `200` / `404` | solo campos públicos/autorizados |
| `POST /products` | crear recurso asignando ID servidor | `201` + `Location` cuando existe URI | POST no garantiza idempotencia |
| `PUT /products/{product_id}` | reemplazar la representación **modificable definida por el contrato** | `200` / `204` (o `201` si crea y contrato lo permite) | PUT es idempotente por semántica, no debe esconder PATCH |
| `PATCH /products/{product_id}` | cambio parcial con semántica explícita | `200` / `204` | PATCH **no** es idempotente automáticamente |
| `DELETE /products/{product_id}` | suprimir/desactivar **solo si el dominio lo admite** | `204` / `404` | DELETE es idempotente respecto al efecto; respuestas repetidas pueden variar |
| `POST /policies/{policy_id}/approve` | comando de negocio con invariantes | `200` / `204` / `202` | modelar como comando o como recurso `approvals` si aporta identidad e historial |

La API **DEBE** ser explícita sobre soft delete, cancelación, revocación y borrado legal; `DELETE` no obliga a borrado físico. Evitar endpoints artificiosos que exponen métodos internos.

✅ **Correcto**

```http
GET    /api/v1/products?estado=pendiente&limit=25&offset=0
POST   /api/v1/products
PATCH  /api/v1/products/8d9a...
POST   /api/v1/policies/8d9a.../approve
GET    /api/v1/policies/8d9a.../endorsements
```

❌ **Incorrecto**

```http
GET    /getProducts
GET    /deletePolicy/123
POST   /updateProduct
GET    /policies/123/customers/4/addresses/2/orders/9/history/items
```

### Naming, versionado y compatibilidad

- Preferir sustantivos plurales `kebab-case` en rutas y parámetros de ruta coherentes con naming interno: `/{product_id}`; no incorporar acciones `get/create/update` en nombres de colecciones. Una ruta de negocio `/{id}/cancel` puede ser apropiada.
- Elegir **una** convención de prefijo (`/api/v1` o `/v1`) a nivel de producto; no declarar simultáneamente ambas sin motivo. Versionar solo ante rupturas incompatibles, conservar consumidores y publicar política de sunset.
- Las relaciones se anidan cuando expresa pertenencia o alcance; evitar más de 1–2 niveles sin razón. Para búsquedas cruzadas, preferir colecciones con filtros.
- No cambiar unilateralmente nombre de propiedad, valores enum, comportamiento de `null`, sorting ni `200` ↔ `204` en APIs consumidas.
- Evolución compatible: añadir campos opcionales, documentar cambios y comprobar diferencias OpenAPI más contract tests. Para retirada: plan de migración, fechas y `Deprecation`/`Sunset` cuando corresponda.

## 3. Arquitectura interna, límites de responsabilidad

```text
Cliente / API gateway (TLS, límites y correlación)
  → HTTP boundary (authN, permisos, tenant verificado, Zod/FormRequest, rate-limit)
  → Presentation: controller delgado
  → Application: caso de uso semántico y puertos + políticas de acceso
  → Domain: invariantes y transiciones cuando existen
  → Infrastructure: Drizzle/Eloquent, PostgreSQL, caché, proveedores, queue
  → Presentation: proyección explícita/Presenter → contrato HTTP + status + headers
```

- **Domain** no importa `@nestjs/*`, Laravel HTTP, Drizzle/Eloquent ni OpenAPI. **Application** no construye URLs HTTP. **Infrastructure** implementa ports, no define la respuesta JSON.
- Controller delega; no ejecuta SQL ni reglas transaccionales del dominio. Repositorio devuelve entidad o read model con contrato de aplicación. Presenter (clase o función) **solo cuando aporta proyección/seguridad/formato**, no por dogma.
- NestJS: `domain/schemas/product.schema.ts` (estructura Zod) ≠ `infrastructure/persistence/products.table.ts` (tabla Drizzle) ≠ `presentation/http/dto/*.dto.ts` (Zod + tipo inferido **juntos**). **NO** `*.validator.ts` paralelo para HTTP. Swagger/Scalar usa `*.doc.ts` opcional y no se importa en frontend.
- `constructor(private readonly productRepository: ProductReadRepository)` usa `camelCase`; métodos propios `camelCase` semántico (`listProducts`); datos/props `snake_case`; clases/tipos `PascalCase`. No duplicar los tipos derivados del schema. Seguir [naming](../engineering/naming-and-boundaries.md).
- Laravel: FormRequest o Spatie Data con PHP tipado, Resources/presenter explícitos, Service Container y repository port según la complejidad. No copiar mecánicamente carpetas de NestJS.

✅ **Correcto:** `ProductService.listProducts(criteria)` devuelve `PageResult<ProductSummary>` sin `next` y `previous`; el adaptador HTTP los calcula de manera consistente al crear el paginador público `{count,next,previous,results}`.

❌ **Incorrecto:** el repository genera `/api/v1/products?offset=25`, un controller hace `db.select()` o devuelve todas las columnas Drizzle de un tenant.

## 4. Validación de frontera y contrato público

1. Validar `params`, `query`, `body`, `Content-Type`/`Accept` relevantes, tamaño, listas y límites **antes** de ejecutar la operación; validar de nuevo las invariantes dentro del dominio. No confiar en anotaciones TypeScript para validación runtime.
2. Zod v4: `z.input` describe entrada; `z.output` describe valor validado/coercionado. `*.dto.ts` es la fuente HTTP. **NO** crear `*.validator.ts` paralelo ni parseos redundantes por cada retorno tipado.
3. Rechazar **campos de escritura no permitidos** (mass assignment): `tenant_id`, `created_at`, `status` protegido, `is_admin`, `price_verified` y campos server-owned no son asignables por el body. Política de propiedades desconocidas explícita: rechazar en escrituras críticas, o registrar compatibilidad heredada.
4. Distinguir *campo omitido*, *campo presente con `null`* y *remoción*. Para `application/merge-patch+json`, RFC 7396 define `null` como remoción; para `application/json` con PATCH custom definirlo en el contrato; para `application/json-patch+json` seguir RFC 6902 y validar operaciones/paths.
5. **No** asumir que `*.doc.ts`/OpenAPI aplica validación runtime de salida: una proyección explícita protege el wire format; habilitar serialización/validación adicional donde el riesgo lo justifique.

✅ **Correcto:** `ProductSchema['id']`/`productSchema.pick(...)` para tipos/campos ya definidos; presenter hace allowlist de respuesta.

❌ **Incorrecto:** `await repository.update(id, request.body)`, `return row` o `z.coerce.number()` aceptando accidentalmente `''` donde representa dato inválido.

## 5. Listados, filtros, búsqueda y paginación

- Query estable: `?estado=pendiente&search=seguro&sort=-created_at&limit=25&offset=0`. Definir operadores permitidos (`gte/lte/in`), encoding y normalización cuando se necesiten. **NO** construir SQL con nombres de columnas/órdenes recibidos directamente del usuario.
- Limitar `limit` (por ejemplo, default 25, máximo 100 según el endpoint), complejidad, cantidad de filtros y ventanas temporales. Proteger consultas costosas; índices medidos con `EXPLAIN (ANALYZE, BUFFERS)` y métricas reales.
- La respuesta paginada vigente Vigilio es **`{count,next,previous,results}`**: `count` total filtrado **autorizado**, no `rows.length`; `next`/`previous` rutas relativas válidas que preservan filtros y auth scope; `results` no contiene información sensible.
- Orden total y estable (p. ej. `created_at DESC, id DESC`). Offset para necesidades normales; **cursor/keyset** cuando dataset, concurrencia o profundidad justifiquen. Cursor opaco, validado y vinculado a orden, filtros, tenant/usuario y expiración. No mezclar semánticas offset/cursor inadvertidamente.
- Para el total exacto, decidir coste y consistencia: si dos consultas se ejecutan de forma separada pueden observar snapshots diferentes; cuando el contrato exige atomicidad usar transacción/aislamiento adecuado. No prometer consistencia exacta sin implementarla.

## 6. Estados HTTP, errores y medios

| Situación | Estado recomendado | Observación |
|---|---|---|
| lectura con resultado | `200` | GET no debe ejecutar comandos solicitados |
| creado | `201` | `Location` del recurso si aplica |
| trabajo aceptado | `202` | identificador/URI para observar el trabajo |
| éxito sin body | `204` | **NO** enviar JSON ni envelope junto con 204 |
| request malformed | `400` | distinguir de fallo semántico conforme al contrato |
| sin autenticación | `401` | challenges cuando correspondan |
| sin permiso | `403` o `404` | `404` según política anti-enumeración |
| entidad inexistente | `404` | dentro del ámbito del solicitante |
| conflicto de transición | `409` | violación de estado de negocio |
| `If-Match` no coincide | `412` | precondición HTTP fallida; `428` si se exige precondición ausente |
| validación semántica | `422` | solo si la convención adoptada lo define |
| exceso de solicitudes | `429` | `Retry-After` cuando es apropiado |
| error interno | `500` | sin SQL, stacktrace, secreto ni PII |

Para **nuevas APIs**, recomendar **RFC 9457 Problem Details** (`application/problem+json`), con `type`, `title`, `status`, `detail` sin secretos y extensiones `code`/`trace_id` si se necesitan. Si el producto ya tiene contrato de error estable, **migrar con compatibilidad**, no romper clientes por estética.

✅ **Correcto**

```http
HTTP/1.1 409 Conflict
Content-Type: application/problem+json

{"type":"https://api.example.com/problems/policy-state-conflict","title":"Policy state conflict","status":409,"detail":"La póliza no se puede aprobar en este estado.","code":"POLICY_STATE_CONFLICT","trace_id":"trace-safe-123"}
```

❌ **Incorrecto:** devolver `200 {"success":false}` a todos los fallos; exponer `error.stack`, consulta SQL o access token; devolver body en `204`.

## 7. Seguridad empresarial y multi-tenancy

- AuthN verificada (JWT/OIDC u otra solución aprobada), authZ tanto **funcional** como **por objeto** (BOLA/IDOR), rol/atributos/permisos según dominio. No confiar en la presencia de `tenant_id` en headers o body no firmados.
- Derivar tenant del principal autenticado y verificar membresía/delegación; aplicar scope también en consulta SQL, cache keys, jobs, exportaciones, logs/auditoría y búsqueda. Políticas de Application deben ser reutilizables por REST, workers y otros adaptadores.
- Limitar tamaño de request, profundidad/longitud de filtros, output y concurrencia; prohibir autorización *solo* en UI. Definir política de CORS y CSRF según credenciales y modo de autenticación.
- Reducir riesgos SSRF, path traversal, webhook spoofing, inyección, exposición masiva y abuso por costo; rate limit y cuotas según identidad/tenant/operación, y `429` documentado.
- Logs y trazas sin tokens, contraseñas, payloads sensibles, datos regulados innecesarios ni cardinalidad extrema.

✅ **Correcto:** `WHERE tenant_id = principal.tenant_id AND id = :product_id` tras evaluar permisos apropiados.

❌ **Incorrecto:** `GET /policies/other-tenant-id` protegido únicamente por `@UseGuards(JwtAuthGuard)` o cache global `products:list` compartida entre tenants.

## 8. Concurrencia, idempotencia y transacciones

- **SEGÚN EL CASO**: API de edición concurrente devuelve `ETag`, cliente envía `If-Match`; cotejar versión atómicamente antes de modificar. `412` si no coincide, `428` opcional si se exige el header y no llega.
- Escribir invariantes transaccionales en Domain/Application; persistir cambios con constraint, `UPDATE ... WHERE version = ?`, bloqueo o aislamiento apropiado; **no** depender de `GET` previo sin control de carrera.
- Para pagos, emisiones, cancelaciones y otros `POST` críticos, utilizar una política de idempotencia: scope `(tenant, actor/cliente, operación, key)`, huella del request, exclusión entre reintentos concurrentes, respuesta estable, expiración, métricas y política de claves recicladas. `Idempotency-Key` no concede garantías por sí solo.
- Salidas externas tras commit: usar outbox/inbox y deduplicación **cuando** se requiera entrega confiable; evitar prometer *exactly-once* por usar una queue.
- Reintentos solo en operaciones seguras/idempotentes o protegidas por deduplicación; timeouts, backoff con jitter, límites, circuit breaker cuando correspondan.

✅ **Correcto**

```http
PATCH /api/v1/policies/123
If-Match: "version-8"
Content-Type: application/json

{"description":"Nueva descripción"}
```

❌ **Incorrecto:** `UPDATE policies SET ... WHERE id=:id` sin versión en una operación susceptible a pérdida de actualizaciones, o procesar múltiples veces un `POST /payments` por timeout/retry.

## 9. Operaciones complejas: relaciones, batch, jobs y eventos

- **Relaciones:** `/policies/{policy_id}/endorsements` si hay ownership; endpoints de consulta global separados cuando corresponda. Para transiciones semánticas preferir `POST /policies/{id}/approve`; considerar `/approvals` si la aprobación necesita ID propio, historial o consulta.
- **Batch:** distinguir operación atómica de parcial. Documentar orden, tamaño máximo, validación por elemento, reporte de errores y si una falla revierte todas las demás. No usar `207 Multi-Status` indiscriminadamente; establecer contrato batch propio si no es WebDAV.
- **Import/export:** `POST /policy-import-jobs` → `202 Accepted` + `Location: /policy-import-jobs/{job_id}`; `GET` de job devuelve `queued|processing|completed|failed|cancelled`, progreso fiable, expiración, permisos, outcome y errores sanitizados. Jobs propios del tenant. Worker con deduplicación, reintentos, DLQ y retención apropiada.
- **Upload:** comprobar MIME real, extensión, tamaño y permisos; escanear cuando corresponda; links prefirmados breves y scope mínimo; no servir archivos subidos como contenido ejecutable por defecto.
- **Webhooks:** firma del payload **raw**, timestamp/tolerancia, anti-replay, idempotencia, entrega at-least-once documentada y rotación de claves. Nunca confiar en URL secreta como único control.
- **SSE/WebSocket:** solo si las actualizaciones push mejoran el caso; reconexión, auth, límites y filtrado de tenant. Polling es válido para jobs simples.

✅ **Correcto:** aceptar una exportación, persistir el job y ofrecer `GET /policy-export-jobs/{id}` con resultado verificable.

❌ **Incorrecto:** `POST /export` que bloquea minutos, responde `202` sin job ni seguimiento o acepta `items: []` ilimitado.

## 10. Caché, rendimiento, observabilidad y costes

- **Cache-Control** y `ETag`/`If-None-Match` son controles HTTP distintos de control de concurrencia `If-Match`. Usar `304 Not Modified` únicamente según condiciones y semántica HTTP; para datos privados preferir `private` o `no-store` según sensibilidad.
- Cache distribuida **solo** tras medir beneficio y definir invalidación, scope por tenant, auth variant, TTL, keys, stampede y fallos de dependencia. Un caché puede empeorar seguridad o consistencia.
- OTel trace/span, request/correlation ID, logger estructurado (Pino/stack aprobado), métricas RED, SLO/error budget y alertas accionables. Evitar tags con `user_id`, `order_id` u otros valores de alta cardinalidad en Prometheus.
- Límites de CPU, I/O, conexiones DB, pooling, cuotas y presupuestos FinOps cuando haya abuso potencial por query, LLM o búsqueda; perf baselines por operación y pruebas de carga representativas.

## 11. Contrato OpenAPI y calidad verificable

OpenAPI/Scalar documenta **método, ruta, `operationId` semántico, tags, auth, params, requests, response status/body, headers, errores y ejemplos seguros**. Mantener paridad con el runtime; validar diff y cliente consumidor. La versión OAS publicada más reciente al 2026-10-25 es 3.2.1, **pero** se DEBE generar una versión **realmente soportada** por el toolchain usado (no actualizar solo por la cifra).

**Quality gates mínimos por endpoint modificado:**

| Gate | Comprobación | Evidencia |
|---|---|---|
| Contrato | rutas/métodos/status/headers/serialización + diff OpenAPI | artefacto lint/diff y contract test |
| Validación | malformed, campos desconocidos, `null`, límites, encoding | pruebas negativas |
| Seguridad | acceso horizontal/vertical, cross-tenant, mass assignment | pruebas de autorización y acceso denegado |
| Persistencia | filtros SQL, paginación, índices, N+1 y transacciones por riesgo | integration test / plan medido |
| Concurrencia | carreras, `If-Match`/idempotencia **si aplica** | tests de solicitudes repetidas/concurrentes |
| Operación | logs sin secretos, trazas, métricas y SLO según riesgo | telemetry/test o evidencia de entorno |
| Resiliencia | timeout, retry, jobs y fallos externos **si aplica** | casos de fallo y recuperación |

Estados de validación: **`PASS`** solo con evidencia reproducible; **`FAIL`** si se ejecutó y falló; **`NOT_RUN`** si no se ejecutó; **`BLOCKED`** si falta dependencia/permiso/decisión. No confundir doc lint con integración real.

### Checklist PR (aplicable al diff)

- [ ] Método, URI, versionado y semántica REST respetados o compatibilidad justificada.
- [ ] Autorización por objeto, tenant y campos de salida protegidos.
- [ ] Request DTO y response DTO concordantes con wire format, sin `*.validator.ts` redundante.
- [ ] Errores y estados públicos estables; no devolver body en `204`.
- [ ] Filtros/orden/limit/cursor validados; paginador compatible y determinista.
- [ ] Concurrencia, idempotencia, caché, async o batch tratados **si aplica**.
- [ ] OpenAPI, pruebas y evidencias actualizadas, sin prometer `PASS` sin ejecución.
- [ ] Sin capas, dependencias o artefactos ceremoniales.

## 12. Bibliografía técnica (norma externa, no dependencias npm)

- [RFC 9110 — HTTP Semantics](https://www.rfc-editor.org/rfc/rfc9110.html) — métodos, idempotencia, status y conditional requests.
- [RFC 5789 — PATCH](https://www.rfc-editor.org/rfc/rfc5789.html) y [RFC 7396 — JSON Merge Patch](https://www.rfc-editor.org/rfc/rfc7396.html); [RFC 6902 — JSON Patch](https://www.rfc-editor.org/rfc/rfc6902.html).
- [RFC 9457 — Problem Details](https://www.rfc-editor.org/rfc/rfc9457.html).
- [RFC 9745 — Deprecation HTTP Header](https://www.rfc-editor.org/rfc/rfc9745.html).
- [OpenAPI Specification 3.2.1](https://spec.openapis.org/oas/v3.2.1.html) (publicada 2026-09-10; compatibilidad real de tooling manda).
- [OWASP API Security Top 10](https://owasp.org/API-Security/editions/2023/en/0x11-t10/) — autorización por objeto, consumo de recursos y misconfiguración.

**Aplicación por stack:** [NestJS controllers](../../stacks/backend/nestjs/http/controllers.md) · [Laravel controllers](../../stacks/backend/laravel/http/controllers.md) · [Calidad y comentarios](../engineering/code-comments-and-docstrings.md).

## Convención editorial Swagger/Scalar (extensión)

La forma visual compacta `📦 Proceso` + `🔧 Funcionalidad` y sus restricciones editoriales tienen owner en [Documentación de operación OpenAPI](openapi-operation-documentation.md). Presenter es **opcional**; no exigirlo para CRUD trivial.
