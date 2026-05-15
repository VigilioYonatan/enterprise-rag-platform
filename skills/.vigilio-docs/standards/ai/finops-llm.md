# 08 · FinOps / LLM cost engineering

**Hacer**
- Registrar costo/uso por `tenant`, `feature`, modelo/revisión, proveedor, trace y fecha **sin guardar contenido privado**.
- Desglosar tokens de entrada, salida, cache read/write, razonamiento si aplica, embedding, reranking; verificar semántica del proveedor.
- Guardar precios **versionados** (por millón de tokens, moneda, fecha, tier); distinguir **estimado** de **facturado**.
- Evitar doble conteo: algunos proveedores reportan cached tokens **incluidos** en input total; normalizar buckets exclusivos.
- Registrar también costo indirecto local: GPU/CPU, energía, almacenamiento, operación y capacidad ociosa; local no equivale a costo cero.
- Aplicar `max_input`, `max_output`, timeout, concurrencia, rate limit y **reservar presupuesto** atómicamente antes de procesar.
- Alertar cerca del presupuesto; degradar modelo/frecuencia solo si mantiene calidad y permisos; usar hard-stop configurable.
- Optimizar con métricas: chunking, K, caché **con ACL**, modelos pequeños para casos simples, batch ingestion y deduplicación.
- Revisar **costo por respuesta útil / tarea completada**, no solamente gasto mensual o precio por token.
- Conciliar registros con facturación real: créditos, reintentos, descuentos, precios por región/tier e impuestos donde apliquen.

**No hacer**
- Creer que Langfuse/Prometheus impone automáticamente cuotas: necesitas enforcement en aplicación o gateway.
- Permitir reintentos infinitos que multiplican gasto; usar jitter, topes e idempotencia.
- Compartir caché entre tenants sin autorización y versionado de ACL.
- Reducir costo sacrificando seguridad o exactitud sin evaluar el impacto.

**Campos mínimos**: `tenant_id, request_id, model, model_version, prompt_version, input_tokens, output_tokens, cache_tokens, embedding_tokens, estimated_usd, billed_usd, latency_ms, budget_decision`.

## Límite entre política y enforcement

✅ **Correcto:** reservar gasto de forma atómica con control de concurrencia; conciliar **estimación vs factura**; establecer política para fallos del ledger y operaciones ya empezadas.

❌ **Incorrecto:** pensar que [el YAML de ejemplo](../../platform/ai/finops/politica-ejemplo.yaml) se ejecuta por estar versionado, o que un dashboard hace hard-stop automáticamente. Debe existir adaptador de presupuesto, tests de simultaneidad y una decisión explícita fail-open/fail-closed según riesgo.

> Fuente única para **Cobertura de implementación y evidencia (ampliación)**: [abrir documento canónico](../../governance/complete-work-coverage-policy.md).

## FinOps RAG: optimizar respuesta útil, no solo tokens

Medir y presupuestar por `pipeline_version`: ingesta/embeddings (costo amortizado), consultas FTS/pgvector, rerank, generación, almacenamiento, GPU, observabilidad y evaluación. Comparar **costo por respuesta correcta y autorizada**, no solo por token generado.

- Para preguntas transaccionales dirigir a SQL/API y evitar costo de embeddings/retrieval/generación cuando no aportan.
- Utilizar retrieval económico primero, top-N acotado para reranker, límite de contexto y cache versionado/segregado por ACL.
- Controlar presupuesto con reserva atómica y reconciliar facturación real por tenant; pricing de proveedores se fija con fecha y fuente, no se supone inmutable.

✅ **Correcto:** medir p95 y costo incremental al añadir reranker y rechazarlo cuando no mejora calidad/costo conjunto.

❌ **Incorrecto:** registrar «modelo local gratis» ignorando RAM/GPU, energía, operación, discos y retención.
