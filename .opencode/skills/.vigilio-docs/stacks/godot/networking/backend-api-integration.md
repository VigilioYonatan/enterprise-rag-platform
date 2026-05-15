# Backend — login, perfiles, cloud save, leaderboards y pagos

**Estado:** norma activa Godot 4.x. **Owner:** `stacks/godot/`. **Alcance:** integración HTTP con servicios NestJS, Laravel, Rust, Go o plataforma externa.

## Decisiones de arquitectura

1. `HTTPRequest` adecuado para auth/login, perfiles, leaderboards y snapshots; gameplay en tiempo real requiere modelo de red diferente.
2. Seguir contratos REST/OpenAPI canónicos de Vigilio: DTO/versiones, errores, timeout, cancelación, retries controlados, sin duplicar endpoints en escenas.
3. Credenciales/tokens en cliente son comprometibles: minimización, caducidad, TLS, no exponer secretos de servidor, respuestas filtradas y refresh seguro según plataforma.
4. Servicios remotos manejan identidades, multitenancy, compras y datos sensibles. Para juego offline no exigir backend, DB, Redis ni AWS.

## Implementación de referencia

```gdscript
# services/profile_api.gd — respuesta debe validar schema, tipo y campos.
extends Node
@onready var http: HTTPRequest = $HTTPRequest

func fetch_profile(base_url: String, access_token: String) -> Error:
    var headers := ["Authorization: Bearer " + access_token, "Accept: application/json"]
    return http.request(base_url + "/v1/game/profile", headers, HTTPClient.METHOD_GET)

func _on_http_request_request_completed(_result: int, code: int, _headers: PackedStringArray, body: PackedByteArray) -> void:
    if code != 200:
        push_warning("Profile unavailable: " + str(code))
        return
    var parsed: Variant = JSON.parse_string(body.get_string_from_utf8())
    if typeof(parsed) != TYPE_DICTIONARY:
        push_warning("Unexpected profile response")
        return
    # Validar ID, rangos y esquema completo antes de actualizar estado.
```

No registrar el token ni `body` de un usuario real. Establecer `timeout` en HTTPRequest del proyecto.

## Verificación obligatoria

- [ ] Servidor caído, token expirado, HTTP 429 y 500, JSON inválido, latencia y cancelación.
- [ ] No acceder a compra o inventario de otro usuario manipulando IDs.
- [ ] Compatibilidad entre versión actual y anterior del cliente para API publicada.

## Casos adversarios y revisión

- ❌ Usar HTTPRequest para sincronizar posición cada frame.
- ❌ Token de administrador compilado en juego.

## ✅ Correcto / ❌ Incorrecto

- ✅ **Correcto:** comparar alternativas, justificar límites, usar la versión instalada, ejecutar pruebas con evidencia y revisar consumidores.
- ❌ **Incorrecto:** declarar funcional una animación, un audio, un test gráfico o un backend solo porque la escena o el archivo existe.

## Fuentes oficiales y normas compartidas

- [Godot — http request class](https://docs.godotengine.org/en/stable/tutorials/networking/http_request_class.html)
- [Vigilio REST](https://www.rfc-editor.org/rfc/rfc9110.html)
- [DDD pragmático](../../../foundations/architecture/ddd.md) — aplicado solo donde existan invariantes reales.
- [Comentarios útiles](../../../standards/engineering/code-comments-and-docstrings.md).
- [Gates E2E](../../../standards/testing/e2e-quality-gates.md).
- [Impacto y revisión](../../../standards/engineering/change-impact-and-review-gates.md).


## Backend empresarial opcional — datos, contratos y migraciones

El backend se adopta **solo** si existen necesidades reales: perfiles, logros compartidos, compras, rankings competitivos, cloud save, moderación o auditoría. Godot es cliente no confiable: ningún `save_data` local concede automáticamente dinero premium o cambios autoritativos.

### Contratos recomendados

| Operación | Método/endpoint ilustrativo | Comportamiento |
|---|---|---|
| Leer perfil | `GET /v1/game/profile` | JWT/session server-side, autorización por usuario |
| Guardar slot | `PUT /v1/game/saves/{slotId}` | `If-Match`/versión para prevenir overwrite y resolver conflicto |
| Tabla de posiciones | `GET /v1/game/leaderboard` | Paginación, scores verificados en servidor |
| Comprar ítem | `POST /v1/game/purchases` | Idempotency-Key, firma tienda validada por backend, ledger |
| Consultar operación | `GET /v1/game/operations/{id}` | Reconciliación de reintentos y errores temporales |

El endpoint real debe ser propiedad de un proyecto backend y su OpenAPI generado. Este documento **no** crea automáticamente una API ni una base de datos para un cliente offline.

```sql
-- Fragmento PostgreSQL ilustrativo para cloud saves.
-- user_id procede de auth server-side; NO se acepta suplantación desde Godot.
CREATE TABLE game_save_slots (
    user_id uuid NOT NULL,
    slot_id varchar(32) NOT NULL,
    revision bigint NOT NULL DEFAULT 1 CHECK (revision > 0),
    payload jsonb NOT NULL,
    updated_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, slot_id)
);
-- En UPDATE comparar revision antigua; si no afecta filas, devolver 409/412.
```

### Pruebas integradas necesarias

- Cliente A intenta leer/modificar slot del cliente B → DENIED.
- Guardado simultáneo desde dispositivos distintos → conflicto explícito; no pierde datos silenciosamente.
- Petición de compra repetida con igual idempotency key → una sola concesión.
- API fuera de línea → UI ofrece reintentar y conserva partida local hasta reconciliación.
- Revisión de migraciones y concurrencia PostgreSQL en sandbox, solo si ese backend se implementa realmente.

✅ Correcto: backend con propiedad clara, contrato versionado y tests negativos. ❌ Incorrecto: incorporar credenciales de conexión PostgreSQL dentro de `project.godot` o consultar DB directamente desde un videojuego distribuido.

## Escenario adicional — cliente HTTP como adaptador, no como autoridad

```gdscript
# APIClient.gd: nodo con HTTPRequest hijo, ilustrativo.
@onready var http: HTTPRequest = $HTTPRequest
func fetch_profile(endpoint: String) -> Error:
    # endpoint debe provenir de configuración validada y HTTPS en producción.
    return http.request(endpoint)
func _on_http_request_request_completed(result: int, response_code: int,
        headers: PackedStringArray, body: PackedByteArray) -> void:
    if result != HTTPRequest.RESULT_SUCCESS or response_code != 200:
        push_warning("Perfil no disponible; ofrecer retry controlado")
        return
    var payload: Variant = JSON.parse_string(body.get_string_from_utf8())
    if typeof(payload) != TYPE_DICTIONARY:
        push_warning("Respuesta inválida")
        return
    profile_loaded.emit(payload)
```

**Seguridad:** no incluir API keys privilegiadas en `.gd`/exports, validar TLS, tokens de jugador de vida corta, timeouts, autorización server-side, schema, rate limiting y reintentos idempotentes. **Pruebas:** 401/403, 429, 500, timeout, JSON corrupto, desconexión, duplicación de request y logout. **Negativo:** aceptar monedas premium de un JSON manipulado por el cliente.


## Laboratorio de decisiones Senior/Staff — Correcto vs Incorrecto (2026)

Casos independientes de implementación. Cada fila representa **un ejemplo incorrecto y su alternativa correcta**; elegir la solución proporcional al producto, no aplicarla por dogma. Los ejemplos son criterios de revisión, no pruebas ejecutadas.

### 01. Enviar credenciales desde cliente a endpoints sin TLS
- **❌ Incorrecto**: Enviar credenciales desde cliente a endpoints sin TLS.
- **✅ Correcto**: HTTPS y verificación de certificados según plataforma.

### 02. Dejar HTTPRequest activo al cambiar escena con callbacks obsoletos
- **❌ Incorrecto**: Dejar HTTPRequest activo al cambiar escena con callbacks obsoletos.
- **✅ Correcto**: Cancelación, token de solicitud y estado UI seguro.

### 03. Confiar inventario/saldo que envía juego
- **❌ Incorrecto**: Confiar inventario/saldo que envía juego.
- **✅ Correcto**: Backend valida autorización, reglas y datos.

### 04. Reintentar POST compras sin idempotencia
- **❌ Incorrecto**: Reintentar POST compras sin idempotencia.
- **✅ Correcto**: Idempotency key, backoff acotado y tratamiento de conflictos.

### 05. Guardar tokens en Resource versionado
- **❌ Incorrecto**: Guardar tokens en Resource versionado.
- **✅ Correcto**: Almacenamiento de credenciales acorde a plataforma, nunca en export del juego.

### Política de pruebas y optimización

**Gate del stack:** abrir/importar `project.godot` con el Godot fijado, ejecutar tests de escenas/casos negativos y exportar cuando corresponda; audio, control y gameplay requieren también QA en dispositivos.

**Optimización:** perfilar FPS/ms-frame y CPU/GPU en build exportada según género/plataforma; usar pooling/LOD solo tras medir y proteger accesibilidad del HUD.

**Criterio de salida:** incluir requisito, decisión arquitectónica, riesgo, tests ejecutados, métricas pertinentes y estado `PASS | FAIL | BLOCKED | NOT_RUN`. Un ejemplo documental o un script no ejecutado nunca justifican `PASS`.
