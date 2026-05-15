# NestJS: logging Pino y OpenTelemetry sin duplicación

## Instrumentación

Logs Pino estructurados con identificadores de request/span, evento y duración. OpenTelemetry inicializado **antes** de módulos instrumentados, con exportación OTLP hacia Collector. En ESM revisar preload/loader y compatibilidad real de instrumentación; verificar spans en entorno de ensayo, no asumir cobertura automática de cada service NestJS.

- Traces: HTTP, consulta DB, Redis y workers + spans de negocio selectivos.
- Metrics: latencia, errores, requests, caché hit/miss, lag de outbox y jobs en DLQ.
- Logs: niveles por ambiente; redactar secretos, token, query/body sensibles.
- Labels: baja cardinalidad; jamás etiquetar `product_id`, `tenant_id` o `nro_poliza` individual.
- Alertas: SLO burn rate, no ruido operacional irrelevante.

✅ Correcto: `logger.info({ operation: 'listProducts', count }, 'completed')` sin volcar objetos sensibles y métricas de duración por ruta normalizada.

❌ Incorrecto: `console.log(request.body)`, metric labels por ID de producto, instrumentar 3 veces la misma llamada HTTP.

**Verificar:** `/metrics` protegido, traza que conecta HTTP → service → DB, ausencia de secretos con fixtures sensibles, dashboards SLO. [OpenTelemetry oficial](https://opentelemetry.io/docs/languages/js/) · [SLO transversal](../../../../standards/observability/slo-runbooks.md).

## Procedencia documental preservada

- [Capítulo heredado: 11-logging-pino.md](references/11-logging-pino.md) — contenido íntegro conservado.
- [Capítulo heredado: 16-observability-slo.md](../../../../standards/observability/references/16-observability-slo.md) — contenido íntegro conservado.

## Implementación por capas: logs, métricas y trazas

La aplicación crea **una sola instancia** de logging estructurado y una sola inicialización de OpenTelemetry por proceso. El SDK OTel se arranca antes de cargar NestJS y los paquetes instrumentados; el OpenTelemetry Collector gestiona envío, sampling y retries. El logger de HTTP añade `requestId`/`traceId` y **no** vuelca `body`, `headers.authorization` ni `nro_poliza`.

```typescript
// Fragmento: application service. LoggerPort es un port del consumidor.
async listProducts(query: ListProductsQueryDto): Promise<ListProductsResponseDto> {
  const started_at = performance.now();
  try {
    const result = await this.repository.searchProducts(query);
    this.logger.info({ event: 'products.listed', count: result.count }, 'completed');
    return this.presenter.presentProductsPage(result);
  } catch (error) {
    this.logger.error({ event: 'products.list.failed' }, 'failed');
    throw error; // exception filter traduce; no ocultar errores
  } finally {
    this.metrics.observeDuration('products.list', performance.now() - started_at);
  }
}
```

`LoggerPort`, `metrics` y `presenter` son dependencias del consumidor, no APIs incluidas automáticamente en NestJS. El controller HTTP sigue delgado; para trazas HTTP/DB automáticas verificar la instrumentación instalada antes de crear spans manuales.

### Plan de pruebas de observabilidad

1. Llamar a `listProducts` con fixture autorizado y comprobar `traceparent` HTTP → DB cuando la auto-instrumentación esté habilitada.
2. Hacer fallar PostgreSQL y comprobar error HTTP seguro, log con `traceId` y contador de errores sin cardinalidad por ID.
3. Inyectar un número de póliza o token ficticio y comprobar que **no** aparece en la salida exportada.
4. Comprobar que el Collector deja drenar buffers al apagar HTTP y workers, sin bloquear peticiones.
5. Definir un SLO medible (`availability`, `error_rate`, latencia p95) y un runbook con fuente de datos, burn rate, propietario y respuesta.

✅ Correcto: una cadena de correlación y métricas de baja cardinalidad (`route`, `status`, `operation`).

❌ Incorrecto: `console.log(query)`, etiquetas `customerId` por serie o prometer spans NestJS automáticos sin verificar la versión instrumentada.
