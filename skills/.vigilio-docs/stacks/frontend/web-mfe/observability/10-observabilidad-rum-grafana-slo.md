# Observabilidad Frontend, RUM, Grafana Y SLO

## Qué es observabilidad frontend

Permite relacionar la experiencia del navegador con CDN, BFF y servicios backend. Un logger de consola o un dashboard vacío no constituyen observabilidad productiva.

## Señales mínimas

- errores JavaScript no controlados;
- error boundaries activados;
- fallos de recursos/chunks;
- LCP, INP y CLS;
- navegación y route template;
- duración y resultado de operaciones HTTP;
- versión/release y stage;
- correlation ID no sensible.

## Flujo recomendado

```text
browser
  -> RUM / error tracking / collector controlado
    -> logs, metrics y traces de plataforma
      -> Grafana y alertas

CloudFront/S3 access logs
  -> plataforma de logs/metrics

bus-impl
  -> OpenTelemetry / logs estructurados / metrics
```

El navegador no escribe directamente en Grafana, Loki, Prometheus o CloudWatch Logs usando credenciales AWS. Grafana visualiza señales recogidas por servicios controlados.

## Opciones AWS

- CloudWatch RUM para experiencia de navegador.
- Sentry u otro error tracker con scrubbing.
- OpenTelemetry Collector/API de ingestión propia.
- CloudFront real-time/standard logs según costo y necesidad.
- Backend instrumentado para unir correlation ID y traces.

Elegir una ruta; no instalar varios SDKs solapados sin ownership.

## Instrumentación HTTP

Registrar dimensiones de baja cardinalidad:

- operación o route template;
- método;
- status class;
- duración;
- stage y release;
- tipo de fallo;
- correlation ID cuando sea útil.

No usar URL completa, ID de usuario o mensaje arbitrario como label/métrica.

## Redaction

Nunca enviar:

- bearer tokens, cookies o headers completos;
- bodies de request/response;
- emails, DNI, documentos o nombres;
- prompts/respuestas IA;
- presigned URLs;
- stack traces mostrados al usuario.

## Sampling y costo

- 100% de crashes críticos cuando el volumen lo permite.
- Sampling menor para navegación y performance.
- Límites de cardinalidad y tamaño.
- Retención por señal y ambiente.
- Presupuesto mensual y alertas de ingestión.

## SLI/SLO sugeridos

- disponibilidad del shell;
- porcentaje de sesiones sin error;
- p75 LCP/INP/CLS por dispositivo;
- tasa de fallos de operación crítica;
- tasa de chunk-load failure;
- latencia percibida de login y flujo principal.

Los objetivos se definen con negocio/operación y tienen owner. Alertar por consumo de error budget, no por cada error individual.

## Synthetic monitoring

Ejecutar de forma recurrente:

- home/shell;
- autenticación o health público seguro;
- flujo crítico no destructivo;
- disponibilidad de assets y runtime config;
- headers esperados.

## Runbooks

Como mínimo:

- blank screen o error rate alto;
- degradación de Core Web Vitals;
- fallo de API/BFF;
- chunk incompatible después de deploy;
- CSP bloqueando un recurso legítimo;
- rollback del artifact frontend.

## Definition of Done

- SDK/collector configurado por stage y release.
- Redaction y sampling probados.
- Dashboard con frontend, CDN y backend separados.
- SLO, alertas y responsables definidos.
- Synthetic activo.
- Runbook y rollback ensayados.

Hasta contar con evidencia productiva, documentar observabilidad como recomendada o parcial, nunca como implementada.

> Fuente única para **Correcto / Incorrecto: revisión 2026**: [abrir documento canónico](../../../../governance/documentation-dry-and-ownership.md).

### ✅ Correcto / ❌ Incorrecto — Observabilidad Frontend, RUM, Grafana Y SLO

✅ **Correcto:** Para **Observabilidad Frontend, RUM, Grafana Y SLO**, registrar errores y latencias accionables sin exponer PII.

❌ **Incorrecto:** En **Observabilidad Frontend, RUM, Grafana Y SLO**, poner identificadores tenant o user como etiquetas de cardinalidad ilimitada.
