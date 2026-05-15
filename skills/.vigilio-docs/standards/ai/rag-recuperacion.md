# 04 · RAG: recuperación y generación con evidencia

**Hacer**
- Pipeline documental: autenticar → autorizar por documento → recuperar FTS + dense (cuando aplica) → fusionar RRF → rerank medido → verificar citas → montar contexto → responder o abstenerse.
- Baseline recomendado para **corpus empresarial documental mixto**: comparar lexical/dense y partir de **Hybrid RAG (FTS + vector + RRF)**; activar reranking cuando mejore métricas. Para corpus pequeño usar FTS o contexto largo si gana el benchmark; para consultas transaccionales usar SQL/API directamente. Ver [decisión arquitectónica](../../foundations/ai/seleccion-arquitectura-2026.md), [implementación SQL](hybrid-rag-postgresql.md) y [reranking](reranking.md).
- Medir **Recall@K, Precision@K, MRR/nDCG** por tipo de consulta antes de elegir K, `ef_search`, chunking y reranker.
- Evaluar reranking con el mismo dataset: mejor precisión **vs** costo y p95.
- Evitar duplicados por documento, diversificar fuentes cuando corresponda y fijar presupuesto máximo de contexto.
- Cada cita debe apuntar a `document_id`, versión, página/sección y chunk verificable.
- Ante evidencia insuficiente o contradictoria: expresar incertidumbre / abstenerse / pedir fuente adicional según producto.
- Invalidar cachés tras cambio de ACL o documento; dar TTL a resultados cuando hay actualización frecuente.
- Separar **respuestas explicativas** (RAG) de **operaciones transaccionales** (tools/APIs).

**No hacer**
- Elegir `topK=20`, 500 tokens/chunk o umbral de similitud universal sin evaluación.
- Pedir al LLM que genere citas y aceptarlas sin verificar IDs contra los chunks recuperados.
- Asumir que más contexto siempre mejora: aumenta latencia, costo y distractores.
- Declarar 'respuesta verídica' solo porque un juez LLM asignó una puntuación alta.

## Ejemplo de recuperación segura con citas

✅ **Correcto:** pasar actor/ACL al retriever, filtrar candidatos **antes de exponer sus textos** al generador, fusionar ranking con criterio medido y validar que cada cita retornada referencia un chunk autorizado, vigente y recuperado. Si faltan fuentes suficientes, abstenerse explícitamente.

❌ **Incorrecto:** recuperar `topK=20` de todos los tenants y pedir después al LLM que «ignore» los chunks prohibidos, o inventar referencias sin cotejar `document_id`, versión y localización real.

```text
actor autenticado + query
→ autorizacion de documentos (servidor + SQL)
→ busqueda semantica/lexica sobre corpus permitido
→ rerank acotado + presupuesto de contexto
→ generacion
→ verificacion de referencias contra chunks recuperados
→ respuesta citada o abstencion
```

**Pruebas:** dos usuarios del mismo tenant con permisos distintos; documentos borrados/revocados; pregunta sin evidencia; cita inventada; reindexación en curso y cambios de ACL con caché activo. No considerar RAG listo solo por una evaluación de similitud.

> Fuente única para **Cobertura de implementación y evidencia (ampliación)**: [abrir documento canónico](../../governance/complete-work-coverage-policy.md).

