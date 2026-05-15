# Fuentes oficiales (consultadas en octubre de 2026)

1. **pgvector** (operadores, HNSW/IVFFlat, filtros, ANN, dimensiones y multitenancy): https://github.com/pgvector/pgvector
2. **PostgreSQL 18 · Row Security Policies** (RLS y excepciones de roles privilegiados): https://www.postgresql.org/docs/current/ddl-rowsecurity.html
3. **OWASP LLM08 · Vector and Embedding Weaknesses**: https://genai.owasp.org/llmrisk/llm082025-vector-and-embedding-weaknesses/
4. **OWASP Top 10 for LLM Applications**: https://genai.owasp.org/llm-top-10/
5. **OpenTelemetry · GenAI Observability (2026)**: https://opentelemetry.io/blog/2026/genai-observability/
6. **Langfuse · Token & Cost Tracking** (uso, buckets y pricing): https://langfuse.com/docs/observability/features/token-and-cost-tracking
7. **Arize Phoenix** (tracing/evaluación self-hosted): https://arize.com/phoenix/
8. **Promptfoo · Assertions/model-graded** (context faithfulness/recall): https://www.promptfoo.dev/docs/configuration/expected-outputs/model-graded/
9. **Ollama · Qwen3 Embedding** (0.6B/4B/8B): https://ollama.com/library/qwen3-embedding
10. **FinOps Foundation · Principios**: https://www.finops.org/framework/principles/
11. **FinOps Foundation · Allocation**: https://www.finops.org/framework/capabilities/allocation/

**Lectura:** las reglas son recomendaciones de ingeniería sintetizadas; **no** son una reproducción textual de las fuentes. Verifica la compatibilidad de dependencias y la política de seguridad vigente antes de desplegar.

## Cómo interpretar y verificar estas fuentes

✅ **Correcto:** contrastar la versión efectiva de pgvector/PostgreSQL, los permisos SQL y el digest/dimensión de embeddings con la fuente oficial pertinente; después registrar pruebas sobre el entorno real.

❌ **Incorrecto:** tomar una página de documentación o una fecha de consulta como prueba de que una integración ya se ejecutó o quedó certificada para producción.

**Evidencia mínima:** URL oficial, fecha revisada, versión fijada, comando/test ejecutado, resultado y excepción conocida. Una fuente puede cambiar después de publicarse este inventario.

## Fuentes oficiales actualizadas — octubre 2026

- [Microsoft — Hybrid Search y RRF](https://learn.microsoft.com/en-us/azure/search/hybrid-search-overview)
- [PostgreSQL 18 — Full Text Search](https://www.postgresql.org/docs/18/textsearch.html)
- [pgvector — HNSW, iterative scans, multitenancy](https://github.com/pgvector/pgvector)
- [QwenLM — embeddings y rerankers de la serie Qwen3](https://github.com/QwenLM/Qwen3-Embedding)
- [Ollama — API `/api/embed`](https://github.com/ollama/ollama/blob/main/docs/api.md)
- [Langfuse — evaluación y datasets](https://langfuse.com/docs/evaluation/overview)
- [Ragas — métricas oficiales](https://docs.ragas.io/en/latest/concepts/metrics/available_metrics/)
- [OWASP — RAG Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/RAG_Security_Cheat_Sheet.html)
- [LangGraph — JS overview](https://docs.langchain.com/oss/javascript/langgraph/overview)

Estas fuentes respaldan capacidades y conceptos, **no certifican** cuál versión del SDK/modelo está instalada en cada consumidor.
