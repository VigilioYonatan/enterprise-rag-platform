# Contrato De Observabilidad

## Estado De Herramientas

Clasifica cada herramienta como `adopted`, `optional`, `planned` o `rejected`.

No declares herramientas adoptadas sin configuración y evidencia ejecutable.

La baseline materializada contiene Prometheus, Grafana y Alertmanager.

OpenTelemetry define instrumentación portable para métricas y trazas.

Loki, Tempo, Jaeger, Fluent Bit, OpenSearch y VictoriaMetrics requieren decisión explícita.

## Señales

| Señal | Contenido | Prohibido |
|---|---|---|
| Logs | evento, nivel, servicio, correlación | secretos, tokens, PII completa |
| Métricas | volumen, errores, duración, saturación | identificadores únicos como labels |
| Trazas | spans entre límites y dependencias | bodies completos |
| Eventos | estado asíncrono y resultado | payload sensible sin redacción |

## Contrato Mínimo

- Propaga `traceId`, `correlationId` y `requestId`.
- Usa nombres estables para métricas.
- Define unidades y labels permitidos.
- Aplica límites de cardinalidad.
- Muestrea trazas mediante configuración.
- Redacta datos antes de exportar.
- Define retención por señal.
- Protege acceso mediante identidad y red.
- Valida costos antes de aumentar volumen.

## SLO Y Alertas

- Define SLI desde el resultado percibido.
- Define objetivo y ventana.
- Usa alertas por consumo del error budget.
- Evita alertas por síntomas internos aislados.
- Enlaza cada alerta con runbook y propietario.
- Prueba rutas de Alertmanager.
- Revisa ruido y falsos positivos.

## Ejemplos

### ✅ Correcto: labels limitados

```ts
httpDuration.observe({ method: 'GET', route: '/orders/:id', status: '200' }, seconds);
```

### ❌ Incorrecto: cardinalidad ilimitada

```ts
httpDuration.observe({ userId, orderId, url }, seconds);
```

### ✅ Correcto: error seguro

```ts
logger.error({ errorCode, traceId, route }, 'Request failed');
```

### ❌ Incorrecto: datos sensibles

```ts
logger.error({ requestBody, authorization, customer }, 'Request failed');
```

### ✅ Correcto: estado verificable

```yaml
tool: prometheus
status: adopted
evidence: deploy/gitops/platform/kube-prometheus-stack.yaml
```

### ❌ Incorrecto: arquitectura aspiracional

```yaml
tools: [prometheus, victoriametrics, tempo, jaeger, loki, opensearch]
status: production
```

## Gates

- Verifica instrumentación mediante tests.
- Verifica dashboards mediante queries válidas.
- Verifica alertas mediante eventos sintéticos.
- Verifica redacción mediante payloads sensibles controlados.
- Conserva evidencia por release.

## ✅ Correcto / ❌ Incorrecto: revisión 2026

- ✅ **Correcto:** Instrumentar logs estructurados con correlación OTel, métricas de baja cardinalidad, SLO y privacidad verificable.
- ❌ **Incorrecto:** Loguear tokens/PII/payloads completos, usar ID de usuario como etiqueta Prometheus o declarar trazas sin exportador.
- **Al recibir código existente:** primero caracterizar el comportamiento, después refactorizar en pasos comprobables. [Guía canónica de modernización](../standards/engineering/refactoring-existing-code.md).
