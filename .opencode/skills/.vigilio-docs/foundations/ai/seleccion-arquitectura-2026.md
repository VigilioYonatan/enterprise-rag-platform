# Selección de arquitectura IA: SQL, Hybrid RAG, Agentic, Graph, multimodal y contexto largo

**Propietario:** decisiones de arquitectura, no tutorial de instalación. **Revisado:** 2026-10-25. La arquitectura depende de la tarea, los permisos, los datos y los resultados de una evaluación. No existe un RAG universal.

## Matriz para elegir por evidencia

| Caso | Primera opción | Escalar a | Qué demuestra que merece la pena |
|---|---|---|---|
| Estado exacto de pedido, saldo, póliza, operación autorizada | SQL parametrizado / API tipada + policy de negocio | Tool calling controlado | Corrección determinista, permisos y auditoría |
| FAQ con pocos documentos pequeños y estables | Contexto largo o búsqueda textual | RAG clásico | Menor costo y misma exactitud en golden set |
| Manuales, pólizas, documentación interna extensa | **Hybrid RAG (FTS + vector) + rerank evaluado** | Más índices/modelos solo si supera baseline | Recall@K, nDCG, faithfulness, citas, p95 y costo |
| Investigación de múltiples saltos que requiere búsquedas adaptativas | Retrieval iterativo con límites | Agentic RAG / LangGraph | Beneficio medido > complejidad, pasos y precio |
| Relaciones complejas entre entidades interconectadas | SQL joins autorizados | GraphRAG/graph DB cuando las relaciones justifican grafo | Exactitud multi-hop sobre dataset real |
| PDFs con diagramas, tablas, capturas, audio | Extracción estructurada con referencia a página | Multimodal RAG | Calidad medible en preguntas visuales |
| Adaptar estilo/comportamiento de modelo | Prompt/configuración/eval | Fine-tuning | Demanda estable y mejoría cuantificada; no reemplaza fuentes actualizables |

**Importante:** embeddings representan contenido; RAG organiza la recuperación antes de generar. GraphRAG y Agentic RAG **no** son upgrades obligatorios. El contexto largo puede ser más simple y barato para un corpus pequeño.

## Ruta arquitectónica recomendada

1. Clasificar la pregunta: exacta/transaccional → **API/SQL autorizados**, documental → retrieval, visual → modalidad adecuada.
2. Autenticar y autorizar actor, tenant y **cada documento**; el filtro debe aplicarse en retrieval y en el acceso final al chunk.
3. Para documentos heterogéneos comparar lexical, dense e híbrida; usar fusión [RRF](../../standards/ai/hybrid-rag-postgresql.md) y reranker [solo si aumenta la calidad](../../standards/ai/reranking.md).
4. Presupuestar el contexto, resolver IDs/versiones de cita e instruir al generador para abstenerse cuando falta evidencia.
5. Evaluar y observar por separado recuperación, generación, ACL, latencia y costo; promover solamente un cambio con mejores resultados en dataset versionado.

## Decisiones y tradeoffs

- **RAG clásico:** menos complejidad, pierde referencias exactas y códigos cuando solo usa vectores. Puede ser suficiente si la evaluación lo demuestra.
- **Hybrid RAG:** dos índices y calibración de fusión, gana cobertura de palabras exactas y semántica. Los filtros de ACL no son una opción.
- **Reranking:** aumenta latencia y recursos; usar top-N acotado y comprobar mejora de precisión a igualdad de presupuesto.
- **Agentic RAG:** necesita presupuestos por pasos, timeout, límites de tools, confirmación humana e idempotencia para efectos laterales.
- **GraphRAG:** alto costo de construcción, actualización y control de aristas; no sustituye SQL sencillo.
- **Multimodal:** requiere extracción/redacción segura y citas que apunten a página, figura o fragmento original.

✅ **Correcto:** resolver «¿en qué estado está la póliza 48392?» mediante `getPolicy()` con permisos; resolver «¿por qué la rechazaron según la normativa?» con evidencia documental híbrida y citas verificables.

❌ **Incorrecto:** guardar el saldo financiero como embedding y responder por similitud; activar GraphRAG y cinco agentes sin comparar contra SQL + Hybrid RAG.

**Verificaciones:** golden set de preguntas exactas, documentales, multi-hop, sin evidencia y de ACL; medir p50/p95, Recall@K, precisión/citas, costo por respuesta útil y porcentaje de abstención apropiada.

**Fuentes:** [Microsoft Hybrid Search](https://learn.microsoft.com/en-us/azure/search/hybrid-search-overview), [PostgreSQL Full Text Search](https://www.postgresql.org/docs/18/textsearch.html), [LangGraph](https://docs.langchain.com/oss/javascript/langgraph/overview).
