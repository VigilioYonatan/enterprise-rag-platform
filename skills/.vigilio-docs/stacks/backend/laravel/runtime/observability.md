# Laravel: OpenTelemetry, Monolog, métricas, trazas y alertas

- HTTP middleware crea/correlaciona request ID, trace context y errores. No generar logs duplicados por controller.
- Monolog/log channels estructurados con campos seguros; OpenTelemetry SDK/auto-instrumentation **sólo tras verificar compatibilidad** Laravel 13/PHP 8.5 y cobertura instrumentada real de HTTP, SQL, Redis y Queue.
- Exportar OTLP a collector; Prometheus para métricas, Loki logs, Tempo traces y Grafana dashboards. SLI: tasa de errores, duración, saturación, colas, fallo caché y resultados de negocio sin PII en labels.

```php
Log::info('products.processed', [
    'product_id' => $product_id, // valorar si se permite como dato en logs
    'tenant_id' => $tenant_id,   // evitar usarlo como label de Prometheus
]);
```

No registrar tokens, passwords, request body completo, pólizas completas ni datos personales. Usar route names en métricas para no causar cardinalidad explosiva. `trace_id` permite ir de HTTP a application, SQL y worker, siempre que el propagator esté realmente configurado.

Alertar por SLO/quemado de error budget; runbooks y límites de retención. Comparte [norma transversal](../../../../standards/observability/otel.md) y [observabilidad de plataforma](../../../../platform-runtime/1-observability-contract.md).

## ✅ Correcto / ❌ Incorrecto: observability

- ✅ OTel de entrada, consultas y caché + logs correlacionados y métricas sin PII.
- ❌ Poner `product_id`/`tenant_id` como label Prometheus o loguear tokens.
- **Gate:** Prueba: span HTTP→DB y logs con traceId, cardinalidad controlada.

Refactor existente: [modernización segura](../../../../standards/engineering/refactoring-existing-code.md).

## Instrumentación real y límites

1. Instalar los paquetes de OpenTelemetry compatibles con Laravel 13 y PHP según `composer.lock`. Verificar inicialización temprana en runtime PHP-FPM y workers.
2. Instrumentar HTTP, consultas Eloquent y Redis; comprobar que spans se exportan al Collector y correlacionan con Monolog.
3. Si un caso de uso requiere span semántico, crear `products.processProduct` sin datos de cliente en atributos; mantener trazas automáticas como comportamiento por defecto.
4. No duplicar spans manuales por cada controller; crear métricas con dimensiones limitadas (`operationId`, `status`, no `product_id`).

```php
Log::info('products.processed', [
    'operation' => 'processProduct',
    'outcome' => 'success',
    // No enviar raw request, tokens, documento personal ni body.
]);
```

✅ Comprobar 200, 4xx y 5xx con traceId correlacionado; ❌ considerar la instalación del SDK evidencia de instrumentación funcional. Gate: prueba HTTP→Eloquent/Redis→Collector en entorno real y paneles/SLO definidos.

> Fuente única para **Cobertura de implementación y evidencia (ampliación)**: [abrir documento canónico](../../../../governance/complete-work-coverage-policy.md).

