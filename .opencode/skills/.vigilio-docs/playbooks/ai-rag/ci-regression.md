# CI: cuándo correr pruebas de regresión

| Cambio | Pruebas mínimas | Rollback |
|---|---|---|
| Embedding/dimensión | Recall@K, espacio, índice nuevo, idiomas, ACL | Mantener índice anterior |
| Chunking/extracción | Tablas, página/citas, casos largos, precisión | Volver a parser/pipeline previo |
| Prompt / modelo generador | Faithfulness, abstención, costo, p95, seguridad | Versión previa prompt/modelo |
| Reranker / búsqueda híbrida | nDCG, Recall@K, p95, costo | Flag por tenant |
| RLS / ACL | Pruebas cross-tenant, rol SQL sin privilegios | Rollback de migración validado |
| Precios/cuotas | Buckets de tokens, presupuesto concurrente, conciliación | Tabla de precios versionada |
| Tracing | Atributos mínimos, redacción, sampling, export | Flag y retención |

**CI rápido:** formato + unit + contratos + 10 casos críticos. **CI antes de release:** dataset completo, adversarial, performance y revisión humana de fallos relevantes. Umbrales se acuerdan con propietarios de producto y riesgo.

## Ejemplo de gate sin resultados inventados

✅ **Correcto:** ejecutar el mismo dataset versionado contra baseline y candidato; registrar `Recall@K`, fallos de ACL entre usuarios y tenants, citas inválidas, p95 y coste por consulta. Publicar resultados `PASS`/`FAIL`/`NOT_RUN` por condición y bloquear promoción si hay criterios críticos pendientes.

❌ **Incorrecto:** aceptar una mejora de nDCG como prueba de seguridad o subir un nuevo embedding porque un ejemplo manual obtuvo una respuesta convincente.

```text
cambio: nueva version de embeddings
pruebas: contrato dimensional + ACL/RLS + Recall@K + citas + p95 + costo
resultado: NOT_RUN  # sustituir solo por resultados obtenidos realmente
accion: NO-GO hasta evidencia y aprobacion
```

**Separación:** los scripts CI ejecutables deben vivir en el repositorio consumidor/plataforma; este documento define qué verificar, no afirma que ya exista un runner.

> Fuente única para **Cobertura de implementación y evidencia (ampliación)**: [abrir documento canónico](../../governance/complete-work-coverage-policy.md).


**Checklist específico y fuente única de métricas:** [evaluación RAG](../../standards/ai/evaluacion-calidad.md) y [gates go/no-go](go-no-go.md); medir lexical vs dense vs RRF vs reranker y no repetir tablas normativas de esas guías.
