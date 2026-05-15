# Observabilidad Mobile, SLI Y SLO

## Objetivo

Relacionar experiencia en dispositivo con backend sin convertir telemetría en una base de PII. Logs,
traces, métricas, crashes y releases comparten ambiente, versión, runtime y correlation ID.

## Señales mínimas

| Señal | Dimensiones permitidas |
|---|---|
| Crash/ANR | app version, OS, device class, release |
| HTTP | ruta normalizada, status class, duración, red |
| UX crítica | operación, resultado, duración |
| OTA/build | runtime, channel, update/build ID |
| Recursos | startup, memoria, JS stalls cuando sea medible |

No usar email, token, URL presignada, texto libre ni ID de negocio como label de alta cardinalidad.

## Correlación

La app genera `x-correlation-id` por operación. Si existe tracing compatible, propaga `traceparent`
válido y registra sampling. Backend devuelve el correlation ID para soporte. Crash reports adjuntan
breadcrumbs redactados, no bodies completos.

## SLI/SLO sugeridos

- crash-free sessions >= 99.8% por versión estable;
- éxito de login/product flow según negocio;
- p95 de operación crítica, separando red/backend/UI;
- startup dentro del budget por plataforma;
- adopción de versión mínima segura;
- porcentaje de uploads completados sin retry manual.

Los objetivos exactos se acuerdan con producto y se calculan sobre ventanas/volumen suficientes. No
se inventa 99.9% cuando aún no hay medición.

## Alertas y releases

Alertar por burn rate, regresión de release y crash cluster nuevo, no por cada excepción individual.
El runbook identifica owner, dashboard, versión afectada, backend correlacionado, mitigación y decisión
OTA/store rollback.

## Sampling y costo

Errores críticos se conservan con mayor prioridad; sesiones sanas se muestrean. Configuración remota
de sampling tiene límites y no puede habilitar captura sensible. Costos se revisan por evento, sesión
y retención.

## Synthetic y dispositivo

Monitoreo backend no demuestra UX nativa. Maestro programado puede cubrir login/listado/upload en un
ambiente sintético, con datos aislados y sin credenciales humanas.

## Definition of Done

Release identificable, redacción probada, SLI consultable, alertas con runbook y rollback ensayado.

> Fuente única para **Correcto / Incorrecto: revisión 2026**: [abrir documento canónico](../../../../governance/documentation-dry-and-ownership.md).

### ✅ Correcto / ❌ Incorrecto — Observabilidad Mobile, SLI Y SLO

✅ **Correcto:** Para **Observabilidad Mobile, SLI Y SLO**, registrar errores y latencias accionables sin exponer PII.

❌ **Incorrecto:** En **Observabilidad Mobile, SLI Y SLO**, poner identificadores tenant o user como etiquetas de cardinalidad ilimitada.
