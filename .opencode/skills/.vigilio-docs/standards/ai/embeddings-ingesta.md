# 02 · Ingesta, chunking y embeddings

**Hacer**
- Guardar documento original, URI, `tenant_id`, propietario, ACL, versión, hash, estado, fecha y fuente.
- Pipeline: recibir → antivirus/tipo/tamaño → extraer → normalizar → detectar idioma → chunking → embedding → validar → publicar de forma atómica.
- Aplicar OCR **solo si es necesario**; auditar tablas, encabezados, páginas y códigos que la extracción puede perder.
- Preservar títulos, páginas, secciones y offsets como metadatos para citar sin inventar.
- Comparar estrategias de chunking (por títulos/semántica, tamaño, solapamiento) **con evaluaciones**: no existe un número universal.
- Deduplicar por hash y hacer jobs idempotentes. Cambios del documento ⇒ reindexar fragmentos afectados y eliminar versiones obsoletas.
- Versionar `model_id`, digest/revisión, dimensión, normalización, instrucciones de embedding y `pipeline_version`.
- Separar embeddings de documentos y embeddings de preguntas si el modelo requiere prefijos/instrucciones diferentes.
- Mantener un conjunto de consultas en español y otros idiomas realmente usados por el negocio.

**No hacer**
- Generar embeddings de todo el corpus en cada pregunta.
- Cambiar de modelo silenciosamente o mezclar dimensiones/espacios distintos en un mismo índice.
- Usar el LLM de generación como si fuera necesariamente un modelo de embeddings.
- Indexar secretos o PII sin base legal, filtrado y controles de retención.
- Suponer que embeddings son anónimos o irreversibles: trátalos como datos derivados potencialmente sensibles.

**Nota:** `qwen3-embedding:0.6b` soporta hasta 1024 dimensiones; el ejemplo SQL usa `vector(1024)`. pgvector `vector` soporta índices hasta 2000 dimensiones: revisa `halfvec`/arquitectura cuando uses modelos más grandes.

## Ejemplo de pipeline idempotente y trazable

✅ **Correcto:** identificar la versión del documento mediante `tenant + document_id + content_hash + embedding_model_digest + pipeline_version`; volver a procesar la misma versión no duplica chunks. Publicar nuevos fragmentos solo tras completar la ingesta y verificar ACL/citas; conservar una versión anterior utilizable durante reindexación.

❌ **Incorrecto:** recalcular todos los embeddings ante cada pregunta, mezclar vectores de 1024 y 1536 dimensiones en la misma columna o publicar chunks parcialmente cargados que todavía no respetan ACL.

```text
RECEIVED -> SCANNED -> EXTRACTED -> CHUNKED -> EMBEDDED -> INDEXED -> PUBLISHED
                       └─ FAIL -> retry acotado -> DLQ + alerta
```

**Pruebas mínimas:** doble entrega de job, reingesta idéntica, documento actualizado/eliminado, PDF con tablas, vector de dimensión equivocada, extracción sin texto, cambio de ACL y rollback de modelo. La dimensión y modelo reales se comprueban en runtime; `vector(1024)` es solo un ejemplo alineado con una configuración concreta.

> Fuente única para **Cobertura de implementación y evidencia (ampliación)**: [abrir documento canónico](../../governance/complete-work-coverage-policy.md).

## Modelos locales e invariantes de migración (2026)

El punto de partida económico puede ser [Qwen3-Embedding-0.6B](../../technology/libraries/qwen3-embedding.md); [Qwen3-Reranker-0.6B](../../technology/libraries/qwen3-reranker.md) **es otro modelo**. Ver [ciclo de vida](model-lifecycle.md): digest/revisión, dimensión, instrucciones, versiones, backfill y rollback sin contaminación de índices.

✅ **Correcto:** llamar a `/api/embed` con modelo instalado y validar longitud del vector en runtime. ❌ **Incorrecto:** suponer que `qwen3-embedding:latest` es reproducible o que el servidor de embeddings expone reranking automáticamente.
