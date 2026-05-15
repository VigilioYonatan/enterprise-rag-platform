-- EJEMPLO NO IDPOTENTE: CREATE POLICY requiere migración versionada; NO existe ACL individual aquí.
-- REFERENCIA: PostgreSQL + pgvector; NO despliegues sin revisar autenticación, ACL por documento y migraciones.
-- Embedding elegido: qwen3-embedding:0.6b configurado con 1024 dimensiones.
-- La cuenta de aplicación NO debe ser SUPERUSER, propietario ni BYPASSRLS.
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS knowledge_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  source_uri text NOT NULL,
  content_sha256 text NOT NULL,
  source_version text NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','ready','failed','deleted')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, id)
);

CREATE TABLE IF NOT EXISTS knowledge_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  document_id uuid NOT NULL,
  chunk_index integer NOT NULL CHECK (chunk_index >= 0),
  content text NOT NULL,
  page_number integer,
  embedding vector(1024) NOT NULL,
  embedding_model text NOT NULL,
  embedding_revision text NOT NULL,
  pipeline_version text NOT NULL,
  search_text tsvector GENERATED ALWAYS AS (to_tsvector('simple', content)) STORED,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chunks_doc FOREIGN KEY (tenant_id, document_id)
    REFERENCES knowledge_documents (tenant_id, id) ON DELETE CASCADE,
  UNIQUE (document_id, chunk_index)
);

CREATE INDEX IF NOT EXISTS chunks_tenant_doc_idx
  ON knowledge_chunks(tenant_id, document_id);
-- OPCIONAL: activar solo tras comparar HNSW vs búsqueda exacta (recall, p95 y filtros).
-- CREATE INDEX IF NOT EXISTS chunks_hnsw_cosine_idx
--   ON knowledge_chunks USING hnsw (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS chunks_fts_idx
  ON knowledge_chunks USING gin(search_text);

-- Ejemplo BASE de RLS por tenant. ACL por usuario/documento NO está implementada aquí.
ALTER TABLE knowledge_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_documents FORCE ROW LEVEL SECURITY;
ALTER TABLE knowledge_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_chunks FORCE ROW LEVEL SECURITY;

CREATE POLICY document_tenant_isolation ON knowledge_documents
  FOR ALL
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true),'')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true),'')::uuid);
CREATE POLICY chunk_tenant_isolation ON knowledge_chunks
  FOR ALL
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true),'')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true),'')::uuid);

-- Aplicación: BEGIN; SELECT set_config('app.tenant_id', $1, true); ...; COMMIT.
-- El UUID debe provenir del CONTEXTO AUTENTICADO, no del body del usuario.
-- Hacerlo en la MISMA conexión/transacción. Probar pooling y reseteo de contexto.
-- Ejemplo de consulta parametrizada ejecutada en esa transacción:
-- SELECT id, document_id, page_number, content,
--        (embedding <=> $1::vector) AS cosine_distance
-- FROM knowledge_chunks WHERE tenant_id = $2::uuid
-- ORDER BY embedding <=> $1::vector LIMIT $3;
-- `tenant_id` no basta para permisos sobre documentos: unir con ACL autorizada.
-- Bajo HNSW y filtros selectivos medir recall; ver hnsw.iterative_scan.
