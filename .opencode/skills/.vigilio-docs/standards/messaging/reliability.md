# Colas, eventos y entregas fiables

- Mensaje al menos una vez: consumidor idempotente, reintentos acotados, backoff, poison messages + DLQ y replay con runbook.
- Persistir cambios y outbox en una transacción; sólo publicar después de commit; para colas Laravel usar `afterCommit()` cuando aplique, pero ello por sí solo **no sustituye** transactional outbox ante caídas del proceso.
- En Laravel Horizon gestiona Redis queues, no SQS. Elegir adaptador por requisitos reales.
- Correlation IDs, trace propagation y claves de idempotencia; secretos cifrados y datos sensibles minimizados.

[Workers Node](../../stacks/backend/nestjs/messaging/references/45-workers-outbox-sqs.md) · [Workers Laravel](../../stacks/backend/laravel/messaging/queues-outbox.md).

## ✅ Correcto / ❌ Incorrecto: revisión 2026

- ✅ **Correcto:** Jobs idempotentes, reintentos acotados, DLQ y outbox tras commit cuando importa la entrega fiable.
- ❌ **Incorrecto:** Emitir a la cola dentro de la transacción y asumir atomicidad DB/broker; lanzar trabajo ilimitado en `map(async...)`.
- **Al recibir código existente:** primero caracterizar el comportamiento, después refactorizar en pasos comprobables. [Guía canónica de modernización](../engineering/refactoring-existing-code.md).

## Patrón de entrega fiable

```text
HTTP/worker → dominio valida → DB transacción
                          ├── actualiza agregado
                          └── inserta outbox
commit → dispatcher → broker → consumidor idempotente → ACK
                      fallos → retry con backoff → DLQ / revisión
```

- Idempotency key estable por operación lógica y deduplicación en el consumidor; cada reintento puede ejecutarse más de una vez.
- Publicar eventos **después** del commit sin outbox crea ventana de pérdida: elegir outbox cuando el evento deba llegar de forma fiable.
- Guardar correlación, `event_id`, `schema_version`, fecha UTC, datos mínimos y tenant en envelope; no propagar PII innecesaria.
- Trabajos largos: timeouts, visibilidad de cola, backpressure, límites de concurrencia, DLQ y alarma por mensajes envejecidos.

✅ Testear doble entrega y fallo intermedio. ❌ Suponer `exactly once` porque existe una transacción PostgreSQL o porque el framework reintenta automáticamente.

> Fuente única para **Cobertura de implementación y evidencia (ampliación)**: [abrir documento canónico](../../governance/complete-work-coverage-policy.md).

## Entrega fiable frente a condiciones de fallo

| Condición | Protección | Prueba obligatoria |
| --- | --- | --- |
| Evento duplicado | Inbox/checkpoint + índice único | Replay del mismo `event_id` |
| Caída tras commit DB | Outbox en la transacción | Reinicio y publicación posterior |
| Caída entre ejecución y ACK | Consumidor idempotente | Reintento sin duplicar negocio |
| DLQ creciente | Alarmas, límite de reintentos y runbook | Incidente simulado |
| Cambio de payload | `schema_version` + contrato compatible | Consumidor antiguo contra versión nueva |

✅ **Correcto:** separar event contract, política de reintentos y métrica de lag sin prometer exactly-once extremo a extremo.

❌ **Incorrecto:** `publish()` externo antes de confirmar DB, bucle infinito de reintentos o atribuir al broker la idempotencia del negocio.

La implementación concreta en Laravel pertenece a [Queues/Outbox](../../stacks/backend/laravel/messaging/queues-outbox.md); la de NestJS a [Messaging](../../stacks/backend/nestjs/messaging/event-envelopes.md).
