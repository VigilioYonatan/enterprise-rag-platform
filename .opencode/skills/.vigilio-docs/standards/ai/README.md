# IA / RAG / LLMOps: estándares canónicos

- [Ingesta y embeddings](embeddings-ingesta.md)
- [pgvector y PostgreSQL](pgvector-postgresql.md)
- [Recuperación y citas](rag-recuperacion.md)
- [Seguridad](seguridad-ia.md)
- [Evals](evaluacion-calidad.md)
- [Observabilidad LLM](observabilidad-llm.md)
- [FinOps](finops-llm.md)
- [Tools y agentes](agentes-tools.md)
- [Operación](operacion-produccion.md)

Estas páginas son prácticas derivadas de un **playbook externo no ejecutable**; no reemplazan `standards/security/`, `standards/testing/` ni el código probado del consumidor.

## Cómo aplicar estos estándares

✅ **Correcto:** consultar solo los estándares pertinentes a la tarea, combinándolos con las guías del stack concreto, e implementar las verificaciones de [Go/No-Go](../../playbooks/ai-rag/go-no-go.md) antes del release.

❌ **Incorrecto:** copiar los fragmentos de los ejemplos en producción sin adaptación, sin ACL por documento, sin contratos ni pruebas de recuperación/privacidad.

**Nota de trazabilidad:** el material importado es documental; código y pruebas reales son responsabilidad del repositorio consumidor.

## Evolución empresarial 2026: criterio y propiedad única

- [Selección entre Hybrid/Agentic/Graph/multimodal y SQL](../../foundations/ai/seleccion-arquitectura-2026.md) — decisión, **no** tutorial duplicado.
- [Hybrid RAG en PostgreSQL con RRF y ACL](hybrid-rag-postgresql.md) — propietario de SQL híbrido y sus restricciones.
- [Reranking](reranking.md) — comparación, proveedor y gates.
- [Ciclo de vida de modelos y reindexación](model-lifecycle.md) — cambio de embedding sin mezclar espacios.
- [Catálogo Qwen3 / Ragas / LangGraph](../../technology/libraries/README.md) — APIs por proveedor y versión efectiva.

✅ **Correcto:** leer solo las guías relacionadas y enlazar desde NestJS/Laravel/skills sin copiar su implementación.

❌ **Incorrecto:** presentar RAG vectorial puro como única arquitectura en 2026 o declarar productivo el SQL de ejemplo que carece de ACL por documento.

## Orquestación de skills por intención

[Estándar transversal de Auto-Senior](skill-orchestration-policy.md). Cargar fuentes aplicables reales, no las skills del catálogo actual indiscriminadamente.
