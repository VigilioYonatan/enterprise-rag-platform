# 10 · Operación y lifecycle

**Hacer**
- Fijar versiones/digests de imágenes, modelos e índices; usar lockfiles y SBOM si aplica.
- Entornos separados, secretos externos, roles mínimos, network policy/firewall y endpoints internos no públicos.
- Ingesta por jobs idempotentes con reintentos acotados, dead-letter queue y métricas de backlog.
- Publicar cambios de índice con versionado/alias o sustitución atómica y plan de rollback.
- Separar despliegues de código, cambios de prompt y migraciones de embeddings; ejecutar evals antes de promover.
- Configurar backups de PostgreSQL **y documentos originales**, comprobar restore y verificar recuperación de índices.
- Planear borrado completo: documento, chunks, cachés, trazas/retención y copias según políticas.
- Probar fallos: LLM fuera de servicio, embedding lento, DB caída, jobs duplicados, presupuesto agotado.
- Definir SLO, ownership, runbooks y monitoreo de dependencias y cambios de precio/modelo.

**No hacer**
- Cambiar `:latest` en producción sin pruebas ni rollback.
- Hacer OCR o embedding masivo dentro del request HTTP.
- Migrar modelos de embeddings reescribiendo toda la colección sin dual-index y pruebas.
- Equiparar 'funciona en Docker Compose' con alta disponibilidad.

## Ejemplo de despliegue progresivo

✅ **Correcto:** construir el índice candidato de forma aislada, ejecutar pruebas de ACL, recall, citas, coste y p95; conmutar una versión/alias de lectura con rollback documentado. Separar el despliegue de código del cambio de modelo y de la reindexación masiva.

❌ **Incorrecto:** modificar el índice activo in-place y borrar el anterior antes de validar; ejecutar embeddings dentro de `POST /ask`; publicar endpoints de modelos o telemetría sin autenticación.

**Checklist operativo:** runbook de rollback por componente, copia/restauración del documento original y de DB, DLQ revisable, migraciones reversibles cuando sea viable, cuota y hard-stop concurrente, error budget, monitoreo y responsable de guardia. Si no hay prueba de restauración o aislamiento, bloquear release.

> Fuente única para **Cobertura de implementación y evidencia (ampliación)**: [abrir documento canónico](../../governance/complete-work-coverage-policy.md).

## Operar Hybrid RAG en producción

Tratar FTS, HNSW, ACL y publicación de documentos como un conjunto: jobs idempotentes, estado ready, métricas por etapa, `EXPLAIN (ANALYZE, BUFFERS)`, reindexación versionada y reversión si cae Recall@K/p95. Ver [Hybrid SQL](hybrid-rag-postgresql.md), [model lifecycle](model-lifecycle.md) y [evals](evaluacion-calidad.md).

- Incidente de permisos/cita falsa/poisoning ⇒ bloquear exposición, revocar acceso y auditar corpus/cache/trazas.
- Reemplazo de modelo ⇒ dual-write/index segregado, canary, mediciones y rollback documentado.
- Degradación de reranker ⇒ fallback a híbrido solo si el baseline anterior cumple seguridad/calidad y los permisos no cambian.

✅ **Correcto:** un release NO-GO si no hay pruebas cross-user del mismo tenant, aunque el p95 sea excelente.

❌ **Incorrecto:** interpretar un dashboard de éxito HTTP como certificación de grounding.
