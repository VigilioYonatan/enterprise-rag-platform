# NestJS — EventEnvelope tipado desde schema y payload versionado

El envelope público usa `snake_case` también dentro de eventos/outbox. Ver [mensajería compartida](../../../../standards/messaging/outbox-idempotency.md), [estándar de nombres](../../../../standards/engineering/naming-and-boundaries.md). Distinguir versión de **schema** de versión de **evento**; no renombrar mensajes históricos consumidos sin migración.

```typescript
// shared/messaging/schemas/event-envelope.schema.ts
import { z } from 'zod';
export const eventEnvelopeBaseSchema = z.object({
  event_id: z.uuid(),
  event_type: z.string().min(1),
  schema_version: z.number().int().positive(),
  occurred_at: z.string().datetime(),
  tenant_id: z.uuid(),
});
export type EventEnvelope<TPayload> =
  z.infer<typeof eventEnvelopeBaseSchema> & { payload: TPayload };

// Validar en runtime SOLO cuando llega evento no confiable
export const createEventEnvelopeSchema = <T extends z.ZodType>(payload_schema: T) =>
  eventEnvelopeBaseSchema.extend({ payload: payload_schema });
```

Para tipos internos, `EventEnvelope<ProductCreatedPayload>` evita crear schemas adicionales solo por tipado. Para eventos externos, `createEventEnvelopeSchema(payloadSchema).safeParse(data)` valida envelope y payload al recibirlo. El payload propietario vive en el dominio/evento específico, **no** dentro de `event-envelope.schema.ts`.

✅ **Correcto:** claves públicas `event_id`, `event_type`, `schema_version`, `occurred_at`, `tenant_id`, `payload`; outbox y estado de negocio atómicos en SQL; consumidor idempotente y schema evolution probado.

❌ **Incorrecto:** publicar `event_id`, `schema_version` o `tenant_id` en un protocolo definido como snake_case, repetir uniones manuales, meter secretos en payload, asumir exactly-once de transporte, cambiar wire format sin migración.

## Pruebas contractuales

- Schema: IDs/version inválidos, timestamps ISO no válidos, payload incompatible.
- Seguridad: denegar tenant ajeno; redactar secretos, política de retención.
- Outbox: caída después del commit, retry idempotente, evento duplicado/orden distinto, DLQ y replay.
- Compatibilidad: consumer antiguo/nuevo, esquema versionado, OpenTelemetry correlation ID sin PII.

**Estado:** ejemplos `NOT_RUN` sin broker, base y consumidores reales.
