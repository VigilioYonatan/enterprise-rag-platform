# Fundamentos de arquitectura IA

- [RAG vs agentes y workflows](decisiones-rag-agentes.md)
- [Estándares técnicos IA](../../standards/ai/README.md)

## Criterio de elección arquitectónica

✅ **Correcto:** empezar con búsqueda/consulta directa cuando cubre la necesidad; elegir RAG solo tras evaluar volumen, necesidad de citas, actualización, ACL, latencia y coste. Referir la decisión al [marco de decisiones](decisiones-rag-agentes.md).

❌ **Incorrecto:** desplegar base vectorial, framework de agentes y múltiples servicios únicamente porque el proyecto utiliza un LLM. La complejidad añadida debe tener evidencia de beneficio.

**Comprobación:** registrar la alternativa más simple, métricas iniciales y condición verificable que justificaría aumentar complejidad.

## Decisiones actualizadas

- [Cómo elegir SQL/tool calling, RAG clásico, Hybrid RAG, Agentic RAG, GraphRAG, multimodal, contexto largo o fine-tuning](seleccion-arquitectura-2026.md).
- [Estándares de recuperación y seguridad](../../standards/ai/README.md).

✅ **Correcto:** escoger la menor complejidad que cumpla requisitos medidos. ❌ **Incorrecto:** instalar agentes y vector DB sin necesidad comprobada.
