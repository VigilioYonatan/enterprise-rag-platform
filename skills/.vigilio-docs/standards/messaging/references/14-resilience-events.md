# Resiliencia de Eventos - `bus-impl` 2026

Este documento cierra la confiabilidad de workers, SQS, SNS, EventBridge y procesos async.

Los nombres de operaciones y eventos usados mas adelante son referenciales. No implican que esos
modulos existan en `bus-impl`.

Regla madre:

- todo comando importante debe ser idempotente
- todo evento debe poder reintentarse sin corromper datos

---

## 1. Outbox

Usar transactional outbox cuando:

- se persiste DB y se publica evento
- el evento dispara procesos de negocio
- perder el evento seria grave

Flujo:

```text
transaction -> update aggregate -> insert outbox_event -> commit -> publisher -> bus -> mark published
```

Regla:

- no publicar evento externo antes de confirmar la transaccion

---

## 2. Inbox y deduplicacion

Consumers deben registrar mensajes procesados:

- `message_id`
- `event_id`
- `event_type`
- `consumer`
- `processed_at`
- `checksum` opcional

Regla:

- si llega el mismo evento dos veces, el resultado final debe ser el mismo

---

## 3. Idempotency keys

Para comandos HTTP criticos:

- aceptar `Idempotency-Key`
- asociarla a `tenant_id`, `user_id`, ruta y body hash
- guardar estado: `processing`, `completed`, `failed_retryable`
- devolver misma respuesta si se repite el request

Aplica a:

- creacion de product
- pagos
- importaciones
- solicitudes que disparan workers

---

## 4. DLQ y replay

Todo consumer SQS critico debe tener:

- DLQ
- max receive count definido
- alarma por mensajes en DLQ
- runbook de replay
- clasificacion de errores retryable vs permanent

Regla:

- DLQ sin runbook es solo una bodega de fallos

---

## 5. Versionado de eventos

Formato recomendado:

```json
{
  "event_id": "evt_123",
  "event_type": "product.created",
  "event_version": 1,
  "occurred_at": "2026-06-08T00:00:00.000Z",
  "tenant_id": "rimac",
  "payload": {}
}
```

Reglas:

- no romper consumidores existentes
- agregar campos opcionales antes de cambiar estructura
- nuevo breaking change implica `event_version` nuevo
- mantener tests de compatibilidad por version

---

## 6. Ordering

Si importa orden:

- usar SQS FIFO
- definir `MessageGroupId`
- entender throughput y costo

Si no importa orden:

- usar standard queue
- disenar idempotencia

---

## 7. Backoff y circuit breaking

Reglas:

- retries con backoff
- timeouts explicitos
- no reintentar errores permanentes
- circuit breaker para terceros inestables

---

## 8. Observabilidad async

Todo evento debe llevar:

- `correlation_id`
- `causation_id`
- `request_id` si nace en HTTP
- `event_id`

Metricas:

- lag
- retries
- DLQ depth
- processing duration
- duplicate count

## ✅ Correcto / ❌ Incorrecto: revisión 2026

- ✅ **Correcto:** Jobs idempotentes, reintentos acotados, DLQ y outbox tras commit cuando importa la entrega fiable.
- ❌ **Incorrecto:** Emitir a la cola dentro de la transacción y asumir atomicidad DB/broker; lanzar trabajo ilimitado en `map(async...)`.
- **Al recibir código existente:** primero caracterizar el comportamiento, después refactorizar en pasos comprobables. [Guía canónica de modernización](../../engineering/refactoring-existing-code.md).

> **Referencia histórica completa, migrada sin recortes de contenido técnico.** La norma vigente corresponde a `foundations/` y `standards/`; las especializaciones NestJS están en `stacks/backend/nestjs/`. Ante contradicciones, seguir documentación canónica y pruebas del proyecto. Los enlaces relativos se actualizaron para mantener la navegación.

✅ **Correcto:** aplicar la normativa compartida y adaptar estos ejemplos tras comprobar versiones.

❌ **Incorrecto:** copiar ciegamente un fragmento histórico o imponer reglas de NestJS a Laravel.
