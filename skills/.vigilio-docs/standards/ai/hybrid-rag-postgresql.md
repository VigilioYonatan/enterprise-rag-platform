# Hybrid RAG PostgreSQL: FTS + pgvector + RRF + ACL

**Propietario:** recuperación híbrida relacional. Para decidir *si usarla*, ver [selección de arquitectura](../../foundations/ai/seleccion-arquitectura-2026.md); para modelo/ingesta ver [embeddings](embeddings-ingesta.md) y para SQL/rendimiento ver [pgvector](pgvector-postgresql.md). **Baseline de referencia**, no servicio desplegado.

## Diseño: dos señales con un mismo conjunto autorizado

1. Obtener identidad y tenant de un contexto autenticado confiable; construir en DB el **conjunto de documentos autorizados** por documento/actor. Filtrar `deleted`, versiones obsoletas y corpus que no esté `ready`.
2. **FTS** PostgreSQL (`tsvector`, `websearch_to_tsquery`, GIN) recupera números de póliza, nombres propios, códigos y palabras literales.
3. **Dense** pgvector (`embedding <=> query_vector`) recupera contenido semánticamente relacionado; empezar con búsqueda exacta, elegir HNSW con benchmark.
4. **RRF** fusiona *posiciones*, no distancias ni scores con escalas incompatibles: `score(d)=1/(k+rank_dense(d)) + 1/(k+rank_fts(d))`. `k=60` es punto de partida, no umbral universal.
5. Deduplicar chunks/versión, aplicar diversidad por documento cuando corresponda y rerank opcional [según pruebas](reranking.md).
6. Verificar vigencia y autorización del conjunto final; el LLM recibe solo texto permitido, IDs de cita verificables y presupuesto acotado de contexto.

## SQL ilustrativo de fusión (contratos y permisos obligatorios)

Este fragmento **NO se puede ejecutar tal cual con `platform/ai/postgresql/schema-rag.sql`**: el SQL original solo implementa RLS tenant y **no crea** `knowledge_document_acl`. La siguiente relación es un contrato ilustrativo que debe modelarse y migrarse primero, según las políticas de la aplicación: `knowledge_document_acl(tenant_id, document_id, user_id, can_read)` con política de lectura auditada.

```sql
-- Ejecutar en transacción y conexión con rol no privilegiado; actor/tenant de auth.
-- $1 :: uuid tenant_id; $2 :: uuid user_id; $3 :: vector(1024) query embedding
-- $4 :: text consulta; $5 :: integer cantidad de resultados validada (1..20).
-- Se muestra FTS 'simple' porque el SQL de referencia usa esa configuración.
WITH permitted_chunks AS MATERIALIZED (
  SELECT c.id, c.document_id, c.content, c.page_number,
         c.embedding, c.search_text
  FROM knowledge_chunks c
  JOIN knowledge_documents d ON d.id = c.document_id AND d.tenant_id = c.tenant_id
  JOIN knowledge_document_acl a ON a.document_id = d.id AND a.tenant_id = d.tenant_id
  WHERE c.tenant_id = $1::uuid AND a.user_id = $2::uuid
    AND a.can_read AND d.status = 'ready'
),
dense AS (
  SELECT id, row_number() OVER (ORDER BY distance, id) AS rank_dense
  FROM (
    SELECT id, embedding <=> $3::vector AS distance
    FROM permitted_chunks ORDER BY embedding <=> $3::vector LIMIT 40
  ) v
),
lexical AS (
  SELECT id, row_number() OVER (ORDER BY lexical_score DESC, id) AS rank_lexical
  FROM (
    SELECT id, ts_rank_cd(search_text, websearch_to_tsquery('simple', $4::text)) AS lexical_score
    FROM permitted_chunks
    WHERE search_text @@ websearch_to_tsquery('simple', $4::text)
    ORDER BY lexical_score DESC, id LIMIT 40
  ) t
),
fused AS (
  SELECT COALESCE(dense.id, lexical.id) AS id,
         COALESCE(1.0 / (60 + dense.rank_dense), 0.0)
       + COALESCE(1.0 / (60 + lexical.rank_lexical), 0.0) AS rrf_score
  FROM dense FULL JOIN lexical ON lexical.id = dense.id
)
SELECT p.id, p.document_id, p.page_number, p.content, f.rrf_score
FROM fused f JOIN permitted_chunks p USING (id)
ORDER BY f.rrf_score DESC, p.id LIMIT $5::integer;
```

**Limitaciones técnicas del ejemplo:** CTE `MATERIALIZED` puede impedir explotar bien el índice vectorial/GIN para colecciones grandes. En producción medir con `EXPLAIN (ANALYZE, BUFFERS)` y, si conviene, reescribir ambas ramas para aplicar joins/filtros autorizados independientemente y permitir planes de índice. El permiso debe ser *previo a revelar texto*; nunca ampliar búsquedas globales solo por ganar velocidad. `knowledge_document_acl` también requiere política RLS/índices únicos/constraints y pruebas multiusuario; esta guía no pretende suplir esas migraciones.

## Índices y operación

```sql
-- Índices existentes/recomendados en migraciones versionadas:
CREATE INDEX IF NOT EXISTS chunks_fts_idx ON knowledge_chunks USING gin (search_text);
CREATE INDEX IF NOT EXISTS chunks_tenant_doc_idx ON knowledge_chunks (tenant_id, document_id);
-- En tabla ACL que debe diseñarse y migrarse:
-- CREATE UNIQUE INDEX acl_document_actor ON knowledge_document_acl(tenant_id, document_id, user_id);
-- HNSW es opcional según recall/latencia del corpus:
-- CREATE INDEX chunks_cosine_hnsw ON knowledge_chunks USING hnsw(embedding vector_cosine_ops);
```

- Medir exact search vs HNSW con los mismos candidatos **autorizados**. Con filtros selectivos, ANN puede devolver menos de `top_k`; comprobar `hnsw.iterative_scan` y particionado si aplica. Un índice compartido entre tenants puede degradar recall.
- Fijar `model_digest`, dimensión, métrica, versión del corpus, idioma/FTS y algoritmo RRF en evaluaciones; mezclar embeddings distintos no es válido.
- El contexto puede contener texto malicioso; tratar todo fragmento recuperado como **dato no confiable**, nunca como system prompt.

## ✅ Correcto / ❌ Incorrecto

✅ **Correcto:** buscar «POL-48392» con FTS y similitud densa sobre los mismos documentos permitidos, aplicar RRF, rerank con presupuesto y citar `document_id + source_version + page_number` realmente recuperados.

❌ **Incorrecto:** buscar todos los tenants y filtrar después en el LLM; sumar directamente similitud coseno y `ts_rank_cd` como scores equivalentes; asumir que `tenant_id` equivale a ACL de usuario.

**Pruebas:** consulta exacta con número, paráfrasis semántica, top-K sin resultados, documento revocado, dos usuarios mismo tenant, un índice HNSW con filtros altamente selectivos, documento eliminado, reindexación en curso y citas falsas. **Estado de ejecución del SQL: NOT_RUN**.

**Fuentes oficiales:** [PostgreSQL FTS](https://www.postgresql.org/docs/18/textsearch.html) · [pgvector](https://github.com/pgvector/pgvector) · [Microsoft RRF](https://learn.microsoft.com/en-us/azure/search/hybrid-search-ranking).
