# NestJS: SQS, SNS, workers, DLQ e idempotencia

> **Referencia canónica actualizada:** [EventEnvelope tipado y contrato `snake_case`](event-envelopes.md). Los fragmentos anteriores conservados tienen valor de procedencia; adoptar esta guía para nuevos cambios.

El adaptador de colas recibe el evento, valida envelope/version/schema y despacha un caso de uso semántico. Mutaciones PostgreSQL + outbox en una transacción; publicación asíncrona y consumo idempotente. SQS normalmente ofrece al menos una entrega: preparar duplicados y reordenación según cola.

## Envelope orientativo

```typescript
export type EventEnvelope<T> = {
  event_id: string;
  event_type: string;
  schema_version: number;
  occurred_at: string; // wire ISO
  tenant_id: string;
  payload: T;
};
```

Política: `event_id` para dedupe, invalidación de claves derivadas después de commit, reintentos con jitter/backoff, visibility timeout, DLQ y replay controlado. No incluir tokens ni PII innecesaria en mensajes.

✅ Correcto: test duplicados, fallo al publicar, replay y transacción que hace rollback al fallar outbox.

❌ Incorrecto: esperar que `publish()` en una transacción SQL comparta commit; omitir idempotencia porque SQS es gestionado.

[Norma compartida](../../../../standards/messaging/outbox-idempotency.md).

## Procedencia documental preservada

- [Capítulo heredado: 14-resilience-events.md](../../../../standards/messaging/references/14-resilience-events.md) — contenido íntegro conservado.
- [Capítulo heredado: 45-workers-outbox-sqs.md](references/45-workers-outbox-sqs.md) — contenido íntegro conservado.

## Cobertura de implementación y evidencia (ampliación)

Estas comprobaciones concretan el tema de esta guía; aplicar solo las pertinentes al sistema consumidor y documentar exclusiones justificadas.

1. **Persistencia:** Persistir evento outbox dentro de transacción con agregado.
2. **Publicación:** Worker despacha tras commit, con backoff y conteo de intentos.
3. **Deduplicación:** Inbox o clave única evita doble efecto tras redelivery.
4. **Errores:** Enviar a DLQ tras política documentada y auditar redrive.
5. **Permisos:** IAM mínimo y payload sin secretos.
6. **Observabilidad:** Correlacionar aggregate-id/event-id/trace-id sin PII en labels.

✅ **Correcto:** conservar el flujo funcional y demostrar criterios de aceptación con tests, trazas, revisión de contratos o un plan reproducible según el riesgo.

❌ **Incorrecto:** sustituir las reglas de negocio por un resumen, copiar implementaciones de otro framework, declarar cobertura sin evidencia o presentar `NOT_RUN` como `PASS`.

**Salida mínima:** responsable del control, riesgo cubierto, evidencia verificable y estado `PASS | FAIL | NOT_RUN | BLOCKED`. Los comandos de ejemplo son ilustrativos salvo que se adjunte ejecución real.
