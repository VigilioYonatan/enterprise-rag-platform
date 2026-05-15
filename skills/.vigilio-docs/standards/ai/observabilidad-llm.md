# 07 · Observabilidad técnica + observabilidad IA

**Hacer**
- Usar **OpenTelemetry** para traces/metrics con `trace_id` entre API → retriever → DB → LLM → respuesta.
- Observar: tasas de error, p50/p95/p99, cola, uso de DB, timeouts, generación y extracción.
- Spans sugeridos: `rag.ingest`, `rag.embed`, `rag.retrieve`, `rag.rerank`, `gen_ai.chat`, `ai.eval`, `ai.budget.reserve`.
- Usar convenciones GenAI cuando estén soportadas (`gen_ai.request.model`, `gen_ai.usage.input_tokens`, `gen_ai.usage.output_tokens`).
- Atributos de negocio **pseudonimizados**: tenant, feature, modelo, prompt_version, index_version, doc_count, retrieved_count.
- En Phoenix **o** Langfuse inspeccionar trazas LLM, evaluación y uso; Grafana/Prometheus monitorean SLO backend y recursos.
- Alertar por error rate, p95, recall caído, costo anómalo, backlog de ingesta, índice fallido, abuso y cuota excedida.
- Definir sampling, retención y RBAC por entorno; capturar payloads completos **solo** con consentimiento/política y redacción.

**No hacer**
- Registrar prompts, respuestas, documentos enteros, API keys o PII por defecto.
- Usar tenant_id, user_id o request_id **sin límite** como label de Prometheus: causa alta cardinalidad; son mejores en trazas/logs.
- Instalar Grafana + Loki + Tempo + dos plataformas LLM en un MVP si no hay equipo para operarlas.
- Confundir una traza rápida con una respuesta correcta.

**Consejo:** Phoenix local al empezar; considerar Langfuse para gestión de costos y workflows de IA. Evitar duplicar telemetría sensible entre sistemas.

## Ejemplo de instrumentación segura

✅ **Correcto:** registrar latencia de retrieval, cantidad de chunks, modelo/digest, versión de prompt e índice, tokens y coste calculado con tarifa versionada; correlacionar todo mediante `trace_id` y métricas de baja cardinalidad. Guardar IDs sensibles solo donde la política lo autorice y con retención limitada.

❌ **Incorrecto:** usar `tenant_id`, `user_id`, `document_id` o prompt completo como etiquetas Prometheus, o inferir que una respuesta es correcta solo porque la traza terminó en menos de 200 ms.

```text
trace: GET /knowledge/answer
  ├─ rag.retrieve    {retrieved_count: 8, index_version: "v3"}
  ├─ rag.rerank      {selected_count: 4}
  └─ gen_ai.generate {model: "modelo-aprobado", usage_tokens: "registrado"}
```

**Pruebas:** atributos permitidos y prohibidos, ausencia de PII/secretos en export, continuidad de trace entre worker y API, sampler y fallback si el collector no está disponible. El ejemplo ilustra campos, no una traza observada.

> Fuente única para **Cobertura de implementación y evidencia (ampliación)**: [abrir documento canónico](../../governance/complete-work-coverage-policy.md).

## Tracing del pipeline híbrido y feedback (2026)

Correlacionar `rag.query → authorize → rag.fts → rag.vector → rag.rrf → rag.rerank → generate → cite_check → evaluate`, capturando duración, cardinalidades acotadas, `retrieval_strategy`, versión de índice/modelo, token in/out y costo con tarifa versionada. Instrumentar **calidad** con dataset/scores, no solo latencia.

En [Langfuse](../../technology/libraries/langfuse.md) usar traces, datasets y scores; en Grafana/Prometheus mantener métricas de baja cardinalidad. Si se aplica política de privacidad estricta, dejar **contenido del prompt, documento y response fuera de la telemetría por defecto**: las herramientas pueden capturarlo si no se desactiva explícitamente.

✅ **Correcto:** desactivar/censurar payloads sensibles y probar exportador contra PII y secretos.

❌ **Incorrecto:** asumir que usar Langfuse/OpenTelemetry anonimiza automáticamente documentos internos.
