# Outbox, inbox, idempotencia y reintentos

## Regla universal

No es atómico hacer commit PostgreSQL y después publicar en SNS/SQS/Redis sin un mecanismo adicional. El outbox persiste datos y evento en una sola transacción; un publicador independiente entrega el evento, y el receptor evita efectos duplicados con inbox/idempotency key.

✅ Correcto: evento versionado, identificador de negocio, tenant autorizado, deduplicación, DLQ y reintentos con jitter; métricas de lag outbox y poison messages.

❌ Incorrecto: `await repository.save(); await queue.publish()` y afirmar entrega exactamente una vez; reintentar operaciones no idempotentes sin deduplicación.

## Procedimiento

1. Modelo de estados y contratos de eventos explícitos.
2. Escritura y outbox en la misma transacción.
3. Proceso publicador con lease/backoff, política de reintentos y recuperación.
4. Worker idempotente con prueba de duplicados, reorder y timeouts.
5. DLQ y manual replay con autorización/auditoría.

[Resiliencia base](reliability.md) · [NestJS](../../stacks/backend/nestjs/messaging/outbox-sqs.md).

## Procedencia documental preservada

- [Capítulo heredado: 14-resilience-events.md](references/14-resilience-events.md) — contenido íntegro conservado.
- [Capítulo heredado: 45-workers-outbox-sqs.md](../../stacks/backend/nestjs/messaging/references/45-workers-outbox-sqs.md) — contenido íntegro conservado.

## Mejoras técnicas verificables — 2026

**9. Outbox real.** ✅ Insertar el mensaje en la misma transacción de negocio, publicar con reintentos y consumer idempotente. ❌ Guardar en PostgreSQL y publicar SQS en la misma función afirmando exactly-once sin reconciliación.

## Cobertura de implementación y evidencia (ampliación)

Estas comprobaciones concretan el tema de esta guía; aplicar solo las pertinentes al sistema consumidor y documentar exclusiones justificadas.

1. **Idempotencia persistente:** Registrar claves de deduplicación y comprobar reentrega después de crash.
2. **Publicación transaccional:** Emitir outbox solo tras commit, con poller y garantía de reintentos.
3. **Orden parcial:** Definir orden por agregado donde importe y verificar mensajes fuera de orden.
4. **Fallos permanentes:** Configurar DLQ, retención, redrive y alertas por poison message.
5. **Correlación:** Propagar trace/contexto de negocio sin payload sensible.

✅ **Correcto:** conservar el flujo funcional y demostrar criterios de aceptación con tests, trazas, revisión de contratos o un plan reproducible según el riesgo.

❌ **Incorrecto:** sustituir las reglas de negocio por un resumen, copiar implementaciones de otro framework, declarar cobertura sin evidencia o presentar `NOT_RUN` como `PASS`.

**Salida mínima:** responsable del control, riesgo cubierto, evidencia verificable y estado `PASS | FAIL | NOT_RUN | BLOCKED`. Los comandos de ejemplo son ilustrativos salvo que se adjunte ejecución real.
