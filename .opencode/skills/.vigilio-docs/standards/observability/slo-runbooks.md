# SLO, SLIs, alertas y runbooks

## Señales mínimas

Tasa de errores, latencia p50/p95/p99, saturación, disponibilidad, backlog/edad de outbox, cache hit/miss, pool PostgreSQL, errores AuthZ; para IA añadir costo por solicitud, calidad y denegaciones ACL.

## Diseño de alertas

- Páginas por fallo que requiere acción inmediata (burn rate de SLO, pérdida de disponibilidad), no solo alto volumen de logs.
- Severidad, propietario, canal, runbook con diagnóstico y rollback; alertas deben probarse.
- `trace_id`/`span_id` permiten correlación, nunca incluir token, correo, clave de consulta con PII como etiqueta.

✅ Correcto: separar métricas de infraestructura de eventos de negocio y comprobar cardinalidad de labels.

❌ Incorrecto: contar cada `productId` como etiqueta Prometheus, registrar body completo o instrumentar manualmente todos los controllers duplicando spans.

[OTel compartido](otel.md), [implementación NestJS](../../stacks/backend/nestjs/runtime/pino-opentelemetry.md).

## Procedencia documental preservada

- [Capítulo heredado: 11-logging-pino.md](../../stacks/backend/nestjs/runtime/references/11-logging-pino.md) — contenido íntegro conservado.
- [Capítulo heredado: 16-observability-slo.md](references/16-observability-slo.md) — contenido íntegro conservado.

## Diseño de SLO y respuesta a incidentes

- Definir **SLI** con numerador/denominador claros, p. ej. proporción de requests HTTP válidos atendidos sin error 5xx y latencia de rutas de negocio.
- Elegir ventana y objetivo con el equipo responsable, diferenciando errores del cliente (`4xx`) de fallos de servicio según dominio.
- Configurar alertas de burn rate con al menos dos ventanas de tiempo para reducir ruido; dashboards no son una política de alertas.
- Cada runbook debe incluir origen de métrica, impacto, hipótesis iniciales, checks de seguridad, acciones reversibles, escalamiento, criterio de cierre y postmortem.
- No usar IDs de usuario ni póliza como etiquetas de Prometheus; almacenar contexto trazable bajo políticas de privacidad y retención.

**Evidencia:** generar tráfico de prueba que eleve errores `5xx` y comprobar que se dispara la alerta correspondiente; simular un rollback y verificar la recuperación del SLI sin pérdida de eventos.

✅ Correcto: SLO ligado al journey `listProducts`/`approvePolicy` con riesgo medible.

❌ Incorrecto: alertar por toda excepción recuperada o configurar un 100% de disponibilidad sin un presupuesto de error operativo.

> Fuente única para **Cobertura de implementación y evidencia (ampliación)**: [abrir documento canónico](../../governance/complete-work-coverage-policy.md).

