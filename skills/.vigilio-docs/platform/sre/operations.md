# SRE: producción, alertas, finops y recuperación

Definir objetivos de servicio y medir disponibilidad, latencia, error rate y saturación para endpoints y workers. Alertar por burn rate de error budget, no por volumen de logs.

- Incidentes: `trace_id` → Grafana traces → logs correlacionados → causa probable → rollback controlado.
- Rollback: separar despliegue de código de rollback de DB; migrations expand-contract para que versiones coexistentes funcionen.
- Redis outage: fallback degradado y tasa de error; Postgres outage: error controlado, no falsificar éxito.
- Queue DLQ: runbook replay con idempotencia; revisar retry storms y límites.
- DR: RPO/RTO medidos con restore drills; backups no cuentan como restauración hasta probarlos.
- FinOps: right-size CPU/mem, almacenamiento/egress y curvas de autoscaling; sin valores inventados.

Instrumentación compartida [observability](../../standards/observability/otel.md) y [runbook histórico](../../platform-runtime/2-eks-gitops-operations.md).

> Fuente única para **Correcto / Incorrecto: revisión 2026**: [abrir documento canónico](../../governance/documentation-dry-and-ownership.md).

## Operación de producción

1. Definir SLI (solicitudes exitosas, latencia p95/p99, errores), SLO, alertas por burn rate y runbooks ejecutables.
2. Separar observabilidad de aplicación (OTel) de infraestructura (nodos/pods, presión de memoria, colas, disco).
3. Definir señales de rollback: tasa 5xx, cola DLQ, errores de base de datos, saturación, pérdida de eventos.
4. Tratar versiones como *baseline candidato* hasta comprobar lockfiles y dependencias en ambiente de staging.

✅ Mantener capacidad de rastrear request → job → base de datos. ❌ Instrumentar IDs únicos como labels métricos, ignorar saturación del pool SQL o registrar credenciales en logs.

## Señales, objetivos y alertas

Definir SLIs por capacidad (éxito y latencia HTTP, saturación de workers, error de cola, DB pool, Redis). Registrar SLO y presupuesto de error; la severidad de alerta representa impacto real, no solo un umbral arbitrario.

- **Logs estructurados:** requestId, traceId, severity, operationId; sin cuerpos HTTP completos, tokens, credenciales ni datos personales.
- **Métricas:** baja cardinalidad: ruta normalizada, método, código HTTP, status de caché; no usar `product_id`, `order_id` ni `tenant_id` en labels.
- **Trazas:** OTel instrumentación inicializada antes de librerías, contexto propagado a workers y HTTP saliente.
- **Alertas:** error budget burn-rate, alta latencia sostenida, saturación y dead-letter. Cada alerta apunta a un runbook con acciones y dueño.

✅ Validar alertas mediante simulación controlada y enlaces de logs/traces; ❌ alertar por cada excepción individual o etiquetar métricas con IDs únicos.

**Revisión postincidente:** línea temporal, causa sistémica, acciones correctivas con responsable y test de no regresión; sin culpabilizar personas.

## Prerrequisitos Operativos de Observabilidad y SRE

1. **Inicialización temprana del TracerProvider:** Cargar la instrumentación OTel (NodeSDK / SDK correspondiente) antes de cualquier importación o listener de base de datos o HTTP.
2. **Propagación W3C estandarizada:** Obligatoriedad de inyectar y extraer cabeceras `traceparent` y `tracestate` en llamadas internas entre microservicios y workers.
3. **Colector OTel endurecido:** Despliegue de OpenTelemetry Collector con procesadores de memoria (`memory_limiter`), buffers de lotes (`batch`) y autenticación de endpoints OTLP.
4. **Presupuesto de error documentado:** Definición formal de SLIs (disponibilidad y latencia) con ventana móvil de 30 días y runbooks accionables asociados a cada alerta.

## Matriz de Decisiones de Observabilidad y SRE

| Contexto / Señal | Opción Recomendada | Alternativa Restringida | Razón Técnica y Riesgo |
|---|---|---|---|
| **Exportación de trazas** | OTel Collector centralizado con OTLP gRPC/HTTP | Exportación directa a SaaS de terceros | El collector central desacopla las aplicaciones del backend final, controla reintentos y agrega límites de memoria. |
| **Estrategia de muestreo** | Tail-based sampling en Collector (100% errores, 5% éxitos) | Head-based sampling fijo al 100% | Evita desbordamiento de almacenamiento y costos desmedidos de red en Grafana Tempo reteniendo 100% de trazas erróneas. |
| **Alertas de SLO** | Multi-window multi-burn-rate (1h a 14.4x, 6h a 6x) | Umbral estático por excepción individual | Los umbrales estáticos generan fatiga de alertas; el burn-rate alerta únicamente ante consumo real del error budget. |
| **Cardinalidad de métricas** | Atributos fijos normalizados (`http_route`, `status_code`, `method`) | Inclusión de `user_id`, `email` o `order_id` | Etiquetas de alta cardinalidad degradan el TSDB de Prometheus y provocan Out-Of-Memory (OOM) en el servidor de métricas. |
| **Redacción de logs** | Serializador Pino/Monolog con allowlist de campos | Filtros ad-hoc por regex en runtime | La redacción estructurada en el serializador garantiza que tokens y PII jamás lleguen al disco ni al pipeline de transporte. |

## Pruebas Negativas y Validaciones de Seguridad

- **Prueba de contención de cardinalidad:** Inyectar requests concurrentes con identificadores de usuario aleatorios y validar que el set de labels de Prometheus permanece invariable. Falla si `user_id` o datos de payload se agregan como etiquetas.
- **Prueba de redacción de secretos:** Enviar requests con cabecera `Authorization: Bearer <secret>` y cuerpo con campo `password`; verificar en los logs de Loki y spans de Tempo que ambos valores son reemplazados por `[REDACTED]`.
- **Prueba de alerta por fatiga:** Simular un incremento transitorio de fallos no sostenido (menor a 2 minutos); verificar que no se disparan alertas de alta severidad que agoten al equipo de guardia.

## Procedimientos de Rollback y Gestión de Error Budget

1. **Disparo de alerta rápida (Burn Rate > 14.4x):** Indica consumo del 2% del error budget en 1 hora (agotamiento total en 2 días).
   - Bloquear promociones activas y detener canarios mediante Argo Rollouts.
   - Revertir el tráfico de pods al replicaset estable anterior.
   - Abrir canal de incidente e iniciar triage correlacionando `trace_id` en Grafana.
2. **Disparo de alerta lenta (Burn Rate > 6x):** Indica consumo del 5% del error budget en 6 horas (agotamiento total en 5 días).
   - Congelar despliegues no críticos de features.
   - Priorizar tareas de confiabilidad y corrección de bugs en el backlog del sprint.

## Evidencia Requerida y Reporte de Estado

Todo cambio en configuración de observabilidad o alertas debe adjuntar evidencia auditable en `reports/preflight-evidence.json`:
- Verificación de conectividad con endpoints de Prometheus/Tempo.
- Validación sintáctica de reglas PrometheusRule con `promtool check rules`.
- Prueba sintética de emisión de traza con propagación de contexto exitosa.
- **Fail-closed estricto:** Si falta la evidencia o no se puede comprobar la conectividad en el entorno, el reporte emite `NOT_RUN` y se bloquea el paso a producción.

> Fuente única para **Cobertura de implementación y evidencia (ampliación)**: [abrir documento canónico](../../governance/complete-work-coverage-policy.md).
