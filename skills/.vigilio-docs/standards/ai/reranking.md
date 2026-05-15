# Reranking en RAG: cuándo, con qué modelo y cómo evaluarlo

**Propietario:** segunda etapa de ranking posterior al retrieval autorizado. No redefine FTS ni HNSW; ver [Hybrid RAG](hybrid-rag-postgresql.md).

## Qué hace

Un **retriever** busca candidatos de forma barata (FTS + pgvector). Un **reranker** evalúa la relación pregunta–fragmento y vuelve a ordenar un subconjunto. No genera la respuesta, no valida permisos y **no** sustituye a embeddings. Puede mejorar nDCG@K, precision@K y grounding, pero aumenta latencia, RAM/GPU y costo.

## Flujo correcto

```text
actor autorizado → recuperar FTS + dense (candidatos autorizados)
→ fusionar RRF → deduplicar → rerank (presupuesto top-N)
→ aplicar límite de contexto + verificar doc/version/ACL
→ LLM con citas reales → evaluación/telemetría
```

### Contrato TypeScript conceptual para NestJS/Node

```typescript
export interface RerankCandidate {
  document_id: string;
  chunk_id: string;
  content: string;
  source_version: string;
}

export interface RerankerPort {
  rankCandidates(
    query: string,
    candidates: readonly RerankCandidate[],
  ): Promise<readonly { chunk_id: string; score: number }[]>;
}
```

El proveedor del modelo debe implementar el puerto y conservar IDs originales; no dejar que un modelo invente nuevos `chunk_id`. Los IDs vienen de los resultados autorizados. **Este ejemplo define una interfaz**, no asume que Ollama exponga automáticamente un endpoint HTTP de reranking compatible. Para el proveedor Qwen3 consulta [guía de Qwen3 Reranker](../../technology/libraries/qwen3-reranker.md).

## Experimentos mínimos

1. Baseline A: lexical; B: dense; C: híbrida RRF; D: híbrida + rerank. Igual corpus, ACL y fixture.
2. Fijar top-N de candidatos y K final con curvas recall/nDCG/p95/costo; los números de ejemplo nunca son defaults universales.
3. Registrar digest/revisión del modelo, idioma, instrucciones, truncamiento de entrada y estrategia de batch.
4. Retener las citas `chunk_id`, fuente, versión y offset; fallar si el reranker devuelve un ID desconocido o texto no autorizado.
5. Ofrecer degradación segura: si reranker falla, usar resultados híbridos **solo si el baseline de seguridad/calidad permite ese fallback**; jamás relajar ACL.

✅ **Correcto:** Qwen3-Reranker-0.6B como candidato económico **evaluado** contra FTS+dense; medir p95 y nDCG por lenguaje y tipo de pregunta.

❌ **Incorrecto:** confundir `qwen3-embedding:0.6b` con un reranker; inventar `/api/rerank` universal en Ollama; pasar documentos privados al proveedor sin política de datos.

**Fuentes:** [Qwen3 series](https://github.com/QwenLM/Qwen3-Embedding), [Microsoft hybrid ranking](https://learn.microsoft.com/en-us/azure/search/hybrid-search-ranking).
