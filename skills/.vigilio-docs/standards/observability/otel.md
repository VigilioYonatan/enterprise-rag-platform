# Observabilidad: logs, métricas, trazas y SLO

- Instrumentación HTTP/DB/Redis/Queue transversal, con `trace_id`/`request_id`, métricas RED/USE y latencia por ruta normalizada.
- OpenTelemetry → Collector → Tempo (traces), Prometheus (métricas), Loki (logs), Grafana (consulta). Componentes son referencias arquitectónicas: confirmar deployments reales.
- Pino en NestJS; Monolog en Laravel. Evitar registrar bodies completos, tokens, PII o query sensibles. Cardinalidad baja: no usar IDs de clientes en labels.
- Domain/use case agrega eventos auditables y spans relevantes, no instrumentación repetida por controller. Incluir error sampling y reglas de retención.
- SLO con presupuesto de error, alertas accionables y runbook, no alertas por cada excepción de usuario.

[Contrato runtime original](../../platform-runtime/1-observability-contract.md) · [Observabilidad Laravel](../../stacks/backend/laravel/runtime/observability.md).

## ✅ Correcto / ❌ Incorrecto: revisión 2026

- ✅ **Correcto:** Instrumentar logs estructurados con correlación OTel, métricas de baja cardinalidad, SLO y privacidad verificable.
- ❌ **Incorrecto:** Loguear tokens/PII/payloads completos, usar ID de usuario como etiqueta Prometheus o declarar trazas sin exportador.
- **Al recibir código existente:** primero caracterizar el comportamiento, después refactorizar en pasos comprobables. [Guía canónica de modernización](../engineering/refactoring-existing-code.md).

## Contrato operativo mínimo

| Señal | Instrumentar | Revisar |
|---|---|---|
| Logs | evento, severidad, servicio, correlación `trace_id` | PII, tokens y credenciales redactados |
| Metrics | tasa HTTP, errores, duración, cache hit/miss, jobs | cardinalidad acotada; **sin ID de usuario/tenant** como label |
| Traces | HTTP, caso de uso importante, PostgreSQL, Redis, cola | propagación entre spans; span names estables |
| SLO | disponibilidad, tasa de error y latencia | ventana/burn-rate y runbook asociado |

✅ Configurar exportador OTLP/Collector y probar un request extremo a extremo. ❌ Considerar que instalar `opentelemetry` ya implica trazas exportadas. En Laravel comprobar cobertura real de auto-instrumentación; en NestJS cargar instrumentación antes de SDKs.

**Prueba de integración:** emitir request con identificador de correlación; verificar que el trace llega al backend, los logs enlazan por `trace_id` y no contienen Authorization/cookies/body completo. No usar observabilidad para exponer datos de clientes.

## Mejoras técnicas verificables — 2026

**8. Cardinalidad y privacidad.** ✅ Span HTTP y DB automático, atributos de ruta normalizados, métricas de baja cardinalidad y logging estructurado correlacionado. ❌ Usar `product_id`, email o número de póliza como label Prometheus; imprimir query completa con PII.

> Fuente única para **Cobertura de implementación y evidencia (ampliación)**: [abrir documento canónico](../../governance/complete-work-coverage-policy.md).


## Cobertura completa y navegación por escenario

- [Matriz aplicable de prácticas, riesgos y aceptación](operational-verification-matrix.md) — seleccionar todas las pertinentes; una guía breve o un índice no equivalen a una implementación terminada.

✅ Correcto: seguir el estándar y registrar evidencia. ❌ Incorrecto: detenerse en los primeros tres ejemplos.
