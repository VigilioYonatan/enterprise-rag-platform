# 06 · Evals: calidad y seguridad medibles

**Hacer**
- Construir un **golden set humano** (p. ej. 50–100 casos iniciales), con consultas habituales, raras, multilingües, adversariales y 'sin respuesta'.
- Guardar `question`, respuesta/evidencia esperada, documentos permitidos, versión del corpus, resultado esperado y severidad.
- Evaluar **por separado** recuperación (recall/precision) y generación (faithfulness, exactitud, citas, abstención).
- Agregar escenarios de filtrado por ACL, documentos desactualizados, tablas, duplicados, no respuesta y herramientas no autorizadas.
- Registrar latencia p50/p95, costo/consulta, errores y tokens junto a calidad.
- Probar cambios A/B en **el mismo dataset** antes de promover embedding, chunking, índice, modelo, prompt o reranking.
- Combinar assertions deterministas (formato, citas, permisos) con jueces LLM; muestrear fallos con evaluación humana.
- Versionar dataset, rubrica, modelo juez y umbrales; evitar regresiones vía CI para casos críticos.

**No hacer**
- Evaluar solo si la respuesta 'suena convincente'.
- Suponer que faithfulness = verdad objetiva: comprueba evidencia y actualidad de las fuentes.
- Hacer que el modelo que genera sea el **único** evaluador sin controles de sesgo.
- Fijar umbrales universales sin tolerancia al riesgo; seguridad/ACL debe tener tolerancia **cero**.

**Propuesta de gate:** cero fugas cross-tenant; cero ejecución no autorizada; citas resolubles; calidad/p95/costo dentro de límites acordados contra baseline.

## Estado de los casos iniciales

El [dataset JSONL](../../playbooks/ai-rag/casos-evaluacion.jsonl) contiene seis casos **ficticios**. Es un comienzo para diseñar un runner, no una batería ejecutada.

✅ **Correcto:** asociar corpus fixture versionado, chunks esperados, permiso por usuario/tenant, evaluator deterministic + revisión humana y umbrales aprobados.

❌ **Incorrecto:** declarar `PASS`, precisión o ausencia de fugas sin ejecutar un pipeline reproducible.

## Cobertura de implementación y evidencia (ampliación)

Estas comprobaciones concretan el tema de esta guía; aplicar solo las pertinentes al sistema consumidor y documentar exclusiones justificadas.

1. **Corpus y permisos:** Auditar fuentes, chunk lineage, tenant y ACL; comprobar revocación y respuestas sin evidencia.
2. **Evaluación independiente:** Medir retrieval, grounding, seguridad, coste, latencia y drift en dataset reproducible.
3. **Límite de coste:** Instrumentar presupuestos bajo concurrencia y registrar proveedor/modelo sin almacenar PII.
4. **Respuesta segura:** Abstenerse o escalar cuando faltan citas, hay prompt injection o herramientas requieren aprobación.
5. **Operación:** Exigir canary, rollback, rate limit, reindexación y runbook según criticidad.
6. **Matriz:** Aplicar los 32 controles específicos de calidad RAG según el riesgo.

**Matriz de escenarios vinculada:** [matriz-calidad-rag](matriz-calidad-rag.md).

✅ **Correcto:** conservar el flujo funcional y demostrar criterios de aceptación con tests, trazas, revisión de contratos o un plan reproducible según el riesgo.

❌ **Incorrecto:** sustituir las reglas de negocio por un resumen, copiar implementaciones de otro framework, declarar cobertura sin evidencia o presentar `NOT_RUN` como `PASS`.

**Salida mínima:** responsable del control, riesgo cubierto, evidencia verificable y estado `PASS | FAIL | NOT_RUN | BLOCKED`. Los comandos de ejemplo son ilustrativos salvo que se adjunte ejecución real.

## Matriz A/B obligatoria para cambios de retrieval (2026)

| Variante | Calidad que medimos | Coste/latencia que medimos |
|---|---|---|
| FTS PostgreSQL | Recall@K por identificador, MRR | SQL p95, selectividad, GIN |
| Dense exacto | Recall@K semántico | CPU/p95 y dimensión |
| Dense HNSW | Recall@K relativo a exacto | tamaño índice, HNSW ef_search, p95 |
| FTS + dense (RRF) | nDCG@K, Recall@K y diversidad de fuentes | p95 de ambas ramas + fusión |
| RRF + reranker | nDCG/Precision@K y groundedness | p95/inferencia/memoria del reranker |
| Agentic RAG (si aplica) | éxito multi-hop, uso correcto de tools | pasos, reintentos, tokens, coste |

Separar **Recall@K por IDs etiquetados** (sin juez) de **Context Recall/Precision o Faithfulness** mediante rúbricas/juez (requiere calibración). Ragas es opcional: su [guía](../../technology/libraries/ragas.md) explica métricas; Langfuse documenta [datasets, experiments y scores](../../technology/libraries/langfuse.md). Ninguno prueba ACL por sí solo.

### Ejemplo de fixture y bloqueo de release

```json
{"question":"¿Por qué se rechazó la póliza 48392?","actor_id":"test-user-A","reference_document_ids":["policy-rules-v4"],"expected_denied_document_ids":["other-user-secret"],"must_cite":true,"expected_abstention":false}
```

Gate: **cero fugas cross-user/tenant**, citas resolubles, calidad no inferior a baseline por tolerancia aprobada y p95/costo dentro de SLO acordados. Para casos sin evidencia exigir abstención. Los datasets ficticios del repositorio no acreditan estas mediciones sin runner.

✅ **Correcto:** evaluar las cinco variantes en corpus y dataset iguales, registrar revisión/digest de modelos y contrastar casos de español, códigos y consultas sin evidencia.

❌ **Incorrecto:** afirmar que «Hybrid siempre gana» o que `Faithfulness=1` significa verdad factual y permiso de lectura.
