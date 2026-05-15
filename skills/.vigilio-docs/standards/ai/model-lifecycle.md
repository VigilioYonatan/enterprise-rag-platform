# Ciclo de vida de modelos de embedding, reranking y generación

**Propietario:** versionado, compatibilidad, reindexación, rollout y rollback de modelos. Los números de versión de frameworks se resuelven en [technology/versions.md](../../technology/versions.md).

## Identidad reproducible

Registrar `provider`, `model_id`, **digest/revisión inmutable**, dimensión real de embedding, normalización, distancia, idioma, instrucciones y truncamiento de consultas/documentos, `pipeline_version`, fecha e índices asociados. `qwen3-embedding:0.6b` es nombre de familia/tag, **no demuestra digest instalado**.

| Modelo | Rol | Propiedad documentada | Precaución |
|---|---|---|---|
| Qwen3-Embedding-0.6B | Vectorización | Dimensión máxima 1024, configurable | El modelo/servidor debe producir la dimensión exacta comprometida |
| Qwen3-Reranker-0.6B | Reranking query–texto | Score de relevancia, **no** embedding | Comprobar runtime/protocolo del proveedor |
| LLM generativo local/API | Respuestas | Configuración y precio por proveedor | No asumir que el generador sirve para vectorización |

## Política de migración

1. Registrar golden set y métricas actuales por idioma, uso, tenant/ACL y costo.
2. Congelar revisión del modelo nuevo; medir memoria, latencia, capacidad, dimensiones, normas de servicio/licencia.
3. Generar embeddings nuevos en **índice/columna/versiones separadas**, no mezclar representaciones aunque tengan misma dimensión.
4. Hacer backfill idempotente con `document_version`/hash; comparar cobertura y permisos. Usar publicación atómica de nueva versión.
5. Ejecutar A/B y dual read en muestras autorizadas; cambiar tráfico por canary y conservar rollback viable.
6. Borrar versiones antiguas solo tras política de retención, seguridad, restauración y rollback aprobada.

✅ **Correcto:** doble índice versionado `model_digest=A/B`, validación real de longitud vectorial y pruebas de revocación tras reingesta.

❌ **Incorrecto:** editar el tag `latest` del embedding y seguir usando el mismo HNSW sin reindexación ni regenerar todo el corpus; conservar fragmentos eliminados en caché/trace.

**Pruebas:** fallo a mitad de backfill, cambio de instrucciones, downgrade, rollback, documento eliminado, vector de longitud equivocada, cambio de ACL y consistencia de citas.

**Referencias:** [Qwen official](https://github.com/QwenLM/Qwen3-Embedding) · [Ollama Embed](https://github.com/ollama/ollama/blob/main/docs/api.md) · [pgvector](https://github.com/pgvector/pgvector).
