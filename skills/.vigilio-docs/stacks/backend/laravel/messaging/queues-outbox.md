# Laravel Queues, SQS, Redis, Outbox e idempotencia

- `ShouldQueue` + `afterCommit()` impide despachar antes de confirmar transacción, pero no asegura publicación si el proceso cae entre commit y dispatch.
- Para DB + evento crítico: insertar **outbox** dentro de misma transacción; worker publica al broker después, con marcas de entrega, reintentos e idempotencia.
- Consumidor verifica `event_id` único y procesa como mínimo una vez. DLQ, backoff y runbook de replay; no asumir exactamente una vez.
- **Horizon requiere Redis queues**: para AWS SQS usar worker compatible SQS, supervisión y DLQ propios, no Horizon.

```php
// Fragmento de job; class ProcessProductJob implements ShouldQueue
public function handle(ProcessProduct $useCase): void
{
    $useCase->processProduct($this->product_id, $this->tenant_id);
}

public function backoff(): array
{
    return [5, 30, 120];
}
```

La clase completa necesitará constructor y propiedades tipadas, además de claves de deduplicación; no copiar fragmentos como archivo ejecutable. En Kubernetes, workers separados de HTTP, healthcheck y shutdown gracioso. Propagar trace context sin incluir datos sensibles.

## ✅ Correcto / ❌ Incorrecto: queues-outbox

- ✅ Outbox en misma transacción DB y consumidores idempotentes con reintentos.
- ❌ Publicar evento SQS antes de commit y asumir exactamente-una-vez sin deduplicación.
- **Gate:** Prueba: crash entre commit y publish, duplicados y DLQ.

Refactor existente: [modernización segura](../../../../standards/engineering/refactoring-existing-code.md).

## Flujo transaccional y duplicados

```php
// En el caso de uso, dentro de la misma DB::transaction():
DB::transaction(function () use ($order): void {
    $order->save();             // estado transaccional
    OutboxRecord::create([      // fila en la misma conexión PostgreSQL
        'event_id' => (string) Str::uuid(),
        'event_type' => 'product.processed',
        'payload' => json_encode(['product_id' => $order->id], JSON_THROW_ON_ERROR),
    ]);
});
// Un publicador externo lee pendientes, publica y marca entregado; reintenta fallos.
```

No llamar a SQS directamente desde la transacción esperando atomicidad entre PostgreSQL y AWS. Consumidores deduplican por `event_id`, aplican reintentos con backoff, DLQ y métricas de antigüedad. `Horizon` solo aplica a colas Redis, no SQS.

✅ Prueba crash entre commit y publish + envío duplicado; ❌ asumir «exactly once» o despachar eventos antes de confirmar BD. Definir retención/purga de outbox y protección de PII del payload.

## Cobertura de implementación y evidencia (ampliación)

Estas comprobaciones concretan el tema de esta guía; aplicar solo las pertinentes al sistema consumidor y documentar exclusiones justificadas.

1. **Transacción:** Insertar outbox y mutación del agregado en la misma transacción.
2. **Reintentos:** Configurar backoff, max-attempts y capturar poison messages.
3. **Idempotencia:** Registrar event-id y no ejecutar doble transición con redelivery.
4. **Permisos:** Filtrar tenant y no incluir PII innecesaria en payload.
5. **Diagnóstico:** Enlazar job-id, trace-id y error con DLQ o tabla de fallidos.
6. **Prueba:** Probar crash entre commit y publicación y redrive de un evento.

✅ **Correcto:** conservar el flujo funcional y demostrar criterios de aceptación con tests, trazas, revisión de contratos o un plan reproducible según el riesgo.

❌ **Incorrecto:** sustituir las reglas de negocio por un resumen, copiar implementaciones de otro framework, declarar cobertura sin evidencia o presentar `NOT_RUN` como `PASS`.

**Salida mínima:** responsable del control, riesgo cubierto, evidencia verificable y estado `PASS | FAIL | NOT_RUN | BLOCKED`. Los comandos de ejemplo son ilustrativos salvo que se adjunte ejecución real.
