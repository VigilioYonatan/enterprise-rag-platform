# Observabilidad, SLO y Runbooks - `bus-impl` 2026

Este documento convierte logs, metricas y traces en operacion real.

Regla madre:

- una alerta sin runbook es deuda operativa

---

## 1. SLIs

SLIs minimos:

- disponibilidad HTTP
- latencia P95/P99
- tasa de errores 5XX
- errores de negocio criticos
- lag de colas
- DLQ depth
- duracion de workers
- errores de DB

---

## 2. SLOs iniciales

Ejemplo:

| Flujo | SLO |
|---|---|
| API critica | `99.9%` disponibilidad mensual |
| Latencia HTTP | P95 menor a `500ms` |
| Workers criticos | `99%` procesado menor a `5m` |
| DLQ | `0` mensajes sin triage |

Regla:

- SLO se negocia con negocio; no se inventa en tecnologia

---

## 3. Error budget

Reglas:

- si se quema presupuesto, se frena feature work riesgoso
- incidentes repetidos abren trabajo de confiabilidad
- deploys productivos deben mirar error budget antes de salir

---

## 4. Dashboards

Dashboard minimo:

- RED: rate, errors, duration
- USE para recursos: utilization, saturation, errors
- DB: conexiones, CPU, locks, slow queries
- SQS: age, visible messages, DLQ
- Lambda: duration, errors, throttles, cold starts si se mide

---

## 5. Alertas

Alertar por sintomas:

- 5XX alto
- latencia P99 alta
- DLQ con mensajes
- lag de cola alto
- DB sin conexiones disponibles
- error budget burn alto

❌ Incorrecto:
- alertas por ruido tecnico sin impacto
- alertas duplicadas
- alertas sin owner

---

## 6. Runbooks

Cada alarma critica debe tener:

- sintomas
- impacto
- dashboard
- queries utiles
- pasos de mitigacion
- rollback
- escalamiento
- owner

Regla:

- si no hay runbook, la alarma no esta lista

---

## 7. Tracing

Usar OpenTelemetry/X-Ray para:

- HTTP request
- DB call
- AWS SDK call
- publish event
- consume event

Propagar:

- `trace_id`
- `correlation_id`
- `request_id`

## ✅ Correcto / ❌ Incorrecto: revisión 2026

- ✅ **Correcto:** Instrumentar logs estructurados con correlación OTel, métricas de baja cardinalidad, SLO y privacidad verificable.
- ❌ **Incorrecto:** Loguear tokens/PII/payloads completos, usar ID de usuario como etiqueta Prometheus o declarar trazas sin exportador.
- **Al recibir código existente:** primero caracterizar el comportamiento, después refactorizar en pasos comprobables. [Guía canónica de modernización](../../engineering/refactoring-existing-code.md).

> **Referencia histórica completa, migrada sin recortes de contenido técnico.** La norma vigente corresponde a `foundations/` y `standards/`; las especializaciones NestJS están en `stacks/backend/nestjs/`. Ante contradicciones, seguir documentación canónica y pruebas del proyecto. Los enlaces relativos se actualizaron para mantener la navegación.

✅ **Correcto:** aplicar la normativa compartida y adaptar estos ejemplos tras comprobar versiones.

❌ **Incorrecto:** copiar ciegamente un fragmento histórico o imponer reglas de NestJS a Laravel.
