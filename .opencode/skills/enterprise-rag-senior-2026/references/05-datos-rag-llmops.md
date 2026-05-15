# 05 — Persistencia, pgvector, RAG y Workers Asíncronos

## Persistencia y Seguridad SQL
- **FORCE ROW LEVEL SECURITY**: Activado en todas las tablas mediante migración `012_v6_senior_hardening.sql`.
- **Aislamiento Multi-Tenant**: Cada consulta SQL se ejecuta en el contexto de `app.current_tenant_id` y `app.actor_sub`.
- **ACL Granular**: Función SQL `is_document_grantee(document_id)` evalúa propiedad directa, permisos explícitos de usuario y membresías en grupos de acceso.

## Vector Search & Embeddings
- Extensión `pgvector` con soporte para índices HNSW (`vector_cosine_ops`) en dimensiones 768d y 1024d.
- Búsqueda híbrida con fusión Reciprocal Rank Fusion (RRF) combinando Full-Text Search (tsvector español/inglés) y similitud coseno.

## Workers Asíncronos & Outbox
- **Transactional Outbox**: Tablas `outbox_events` y `processed_events`.
- **Outbox Relay**: Proceso independiente `dist/outbox/main.js` que lee eventos pendientes y los despacha a BullMQ/Valkey.
- **Worker Pipeline**: Proceso `dist/worker/main.js`:
  1. Escaneo antivirus mediante ClamAV (TCP socket).
  2. Extracción de texto y chunking por code points Unicode seguros.
  3. Generación de embeddings vía Ollama.
  4. Inserción de chunks indexados.
