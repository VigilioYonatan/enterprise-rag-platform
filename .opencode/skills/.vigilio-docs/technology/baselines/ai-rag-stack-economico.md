# Baseline 2026 · Empezar económico, evolucionar con datos

| Capa | Local / MVP | Producción económica | Añadir solo si hay necesidad |
|---|---|---|---|
| API | NestJS **o** Laravel | Igual, hardening | Servicio IA separado |
| BD + vector | PostgreSQL + pgvector | Backups, replicación si aplica | Qdrant/otro si benchmark gana |
| Embeddings | Ollama Qwen3-Embedding-0.6B | Versión/digest fijo + índices segregados | 4B/8B solo tras evaluación |
| Retrieval documental | PostgreSQL FTS + pgvector + fusión RRF | Hybrid RAG con ACL documental y benchmarks | Motor especializado si mejora calidad/costo |
| Reranking | Qwen3-Reranker-0.6B (opcional evaluado) | Servicio con timeout y límites de candidatos | Modelo mayor según nDCG/costo |
| Generación | Ollama (si cumple) | API medible o vLLM | GPU dedicada por tráfico/costo |
| Ingesta | Job worker simple | Redis + BullMQ/Horizon | Orquestación compleja |
| Tracing/evals | Phoenix local + dataset de pruebas | Phoenix **o** Langfuse; Ragas opcional para evals | Segundo backend solo con razón |
| Métricas | Logs estructurados + OTel | Prometheus + Grafana | Loki/Tempo si aporta |
| FinOps | Registro + límites simples | Presupuestos atómicos y dashboards | Chargeback/forecast formal |
| Orquestación | Funciones/casos de uso semánticos | Workflows propios con pasos acotados | LangGraph/Agentic solo cuando hay beneficio medido |
| Deploy | Docker Compose | VPS / contenedores con backups | Kubernetes si escala/equipo |

**Regla de compra:** comparar costo total mensual (API vs GPU: hardware, electricidad, RAM, administración) y calidad **en tu dataset**.

**Compatibilidad crucial:** Qwen3 Embedding 0.6B = hasta 1024 dimensiones; pgvector `vector` admite índices hasta 2000 dimensiones. Un modelo 4B/8B con dimensión superior obliga a elegir otra estrategia (`halfvec`, reducción compatible, etc.).

**No confundir:** licencia gratuita = sin tarifa de licencia; *infraestructura, GPU, backups, disco y mantenimiento siguen costando*.

## Estado de versiones: propuesta, no certificación

Modelo `qwen3-embedding:0.6b` y `vector(1024)` corresponden a un ejemplo compatible por dimensiones; **registrar digest exacto del modelo y medir la dimensión de salida real**. El límite `vector` de 2000 se refiere a indexación estándar, no autoriza mezclar representaciones entre modelos. Otras opciones (`halfvec`, vector truncado) requieren benchmark y migración nueva.

✅ Comparar versiones reales de PostgreSQL, pgvector, runtime, ollama, SDK, modelo y lockfiles en el consumidor.

❌ No fijar versiones de librerías por su fecha de publicación sin comprobar compatibilidad, ni inferir rendimiento o seguridad del cuadro de alternativas.

> Fuente única para **Cobertura de implementación y evidencia (ampliación)**: [abrir documento canónico](../../governance/complete-work-coverage-policy.md).

## Referencias de elección y modelos (octubre 2026)

Arquitectura decidida desde [selección de soluciones](../../foundations/ai/seleccion-arquitectura-2026.md); SQL e índices desde [Hybrid RAG PostgreSQL](../../standards/ai/hybrid-rag-postgresql.md). Para APIs de proveedor **no copiar ejemplos antiguos**: [Qwen3 Embedding](../libraries/qwen3-embedding.md), [Qwen3 Reranker](../libraries/qwen3-reranker.md), [Ollama](../libraries/ollama.md), [Langfuse](../libraries/langfuse.md), [Ragas](../libraries/ragas.md), [LangGraph](../libraries/langgraph.md).

**No confundir modelo candidato con versión instalada:** confirmar tags/digests y lockfiles; benchmark de dimensiones y estrategia de rerank. La autorización por documento no está implementada en el SQL de ejemplo original, por tanto el stack **no tiene estado PASS de seguridad**.
