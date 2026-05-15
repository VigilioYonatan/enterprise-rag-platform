# 03 · PostgreSQL + pgvector

**Hacer**
- Empezar con PostgreSQL + pgvector si ya tienes SQL: reduce cantidad de servicios.
- Guardar **texto original del chunk**, vector, metadatos, versión, fuente y `tenant_id`. El vector **no reemplaza** al documento.
- Usar índice SQL (`tenant_id`, `document_id`) y un índice HNSW **solo después** de medir latencia y recall.
- Comparar búsqueda **exacta vs HNSW** con el mismo conjunto de preguntas: ANN sacrifica algo de recall por velocidad.
- Entender el operador: `<=>` distancia coseno; menor distancia = mejor. En HNSW usar `vector_cosine_ops`.
- Para filtros con ANN, comprobar cuántos resultados sobreviven al filtrado; considerar `hnsw.iterative_scan`, índices parciales o particiones según pruebas.
- Considerar full-text search y fusión con búsqueda vectorial para términos exactos, códigos, nombres y siglas.
- Hacer migraciones, EXPLAIN ANALYZE, backups, restore probado, VACUUM y monitoreo de índices.
- Para multi-tenant: RLS + rol sin BYPASSRLS + filtros de autorización de documento; RLS **solo tenant** no modela ACL individuales.

**No hacer**
- Creer que `WHERE tenant_id = ...` garantiza por sí solo aislamiento o calidad bajo HNSW compartido.
- Ejecutar consultas con superuser o owner que puede saltarse RLS.
- Crear HNSW para todo por defecto: en colecciones pequeñas puede ser mejor búsqueda exacta.
- Usar similaridad vectorial como comprobación de permisos o identidad.

**Referencia:** `platform/ai/postgresql/schema-rag.sql` muestra estructura y RLS **a nivel tenant**. Agrega ACL de documento antes de producción.

## Precisión sobre seguridad del ejemplo SQL

✅ **Correcto:** usar un rol SQL limitado, aislar consultas por tenant y comprobar autorización por **usuario + documento** antes del retrieval; pruebas de SQL bajo la misma transacción/conexión y pooling real.

❌ **Incorrecto:** asumir que `FORCE ROW LEVEL SECURITY` evita bypass de superusuarios o roles `BYPASSRLS`, o que un `tenant_id` autenticado da acceso a todos los documentos de ese tenant. **El SQL adjunto NO aplica ACL de documentos.** `CREATE POLICY` sin migración versionada también falla al reejecutarse.

La creación de HNSW debe depender del benchmark: `schema-rag.sql` es un ejemplo de referencia, no una política de indexación obligatoria. Con ANN + filtros mide recall de los resultados autorizados. No desplegar sin ACL y pruebas cross-user/cross-tenant automatizadas.

> Fuente única para **Cobertura de implementación y evidencia (ampliación)**: [abrir documento canónico](../../governance/complete-work-coverage-policy.md).

## Recuperación híbrida y filtros autorizados

La implementación de FTS (`tsvector`, `GIN`), búsqueda por `embedding <=>` y fusión **RRF** se mantiene en el documento propietario [Hybrid RAG PostgreSQL](hybrid-rag-postgresql.md). No duplicar aquí consultas largas ni suponer que el SQL de `platform/ai/postgresql/schema-rag.sql` implementa ACL por usuario/documento.

✅ **Correcto:** medir recall exacto vs HNSW y p95 sobre corpus autorizado, con rol PostgreSQL limitado y dataset de permisos.

❌ **Incorrecto:** inferir que `RLS(tenant_id)` autoriza todos los documentos dentro del tenant; mezclar escala `ts_rank` y distancia coseno sin normalización/fusión.
