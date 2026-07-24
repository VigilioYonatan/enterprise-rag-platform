import { createHash } from 'node:crypto';
import { eq, sql } from 'drizzle-orm';
import {
  document_versions,
  documents,
  ingestion_jobs,
  knowledge_bases,
  memberships,
  outbox_events,
  processed_events,
  tenants,
  users,
} from '../../../../database/schema';
import type { SeedExecutionContext } from '../../../../shared/infrastructure/database/seeders/seed-types';
import type { DocumentChunkSchema } from '../../../governance/domain/schemas/document-chunk.schema';
import type { DocumentVisibilitySchema } from '../../domain/schemas/document.schema';

interface SeedDocumentFixture {
  doc_id: string;
  kb_id: string;
  version_id: string;
  job_id: string;
  outbox_id: string;
  title: string;
  original_filename: string;
  visibility: DocumentVisibilitySchema;
  chunks: Array<Pick<DocumentChunkSchema, 'id' | 'ordinal' | 'content'>>;
}

function sha256Hex(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

export class KnowledgeSeeder {
  constructor(private readonly ctx: SeedExecutionContext) {}

  async run(): Promise<void> {
    const { actors, ids } = this.ctx;
    const tenant_id = ids.tenant_id ?? ids.tenantId;

    // 1. Each actor self-registers in `users` under `users_self` RLS (`sub = actor_sub()`).
    for (const actor of [actors.owner, actors.admin, actors.viewer]) {
      await this.ctx.withActorDb(actor.sub, async (db) => {
        await db
          .insert(users)
          .values({ sub: actor.sub, email: actor.email })
          .onConflictDoUpdate({
            target: users.sub,
            set: { email: actor.email },
          });
      });
    }

    // 2. Owner creates/updates the demo tenant, self-enrolls as owner, and provisions KBs + documents.
    const docFixtures: SeedDocumentFixture[] = [
      {
        doc_id: ids.zeroTrustDocId,
        kb_id: ids.securityKbId,
        version_id: ids.zeroTrustVersionId,
        job_id: ids.zeroTrustJobId,
        outbox_id: ids.zeroTrustOutboxId,
        title: 'Política Corporativa de Control de Acceso Zero Trust y RLS 2026',
        original_filename: 'politica-zero-trust-rls-2026.md',
        visibility: 'tenant',
        chunks: [
          {
            id: ids.zeroTrustChunk1Id,
            ordinal: 0,
            content:
              'Todo acceso a datos corporativos en Atlas Enterprise RAG aplica FORCE ROW LEVEL SECURITY en PostgreSQL 17 mediante el contexto transaccional app.actor_sub derivado exclusivamente del JWT OIDC emitido por Keycloak 26 con PKCE S256.',
          },
          {
            id: ids.zeroTrustChunk2Id,
            ordinal: 1,
            content:
              'Las respuestas generadas registran evidencia autorizada en answer_evidence y validan cada cita en tiempo de lectura mediante answer_has_revoked_evidence; si un documento cambia de versión o pierde permisos, las citas se ocultan en modo fail-closed.',
          },
        ],
      },
      {
        doc_id: ids.incidentRunbookDocId,
        kb_id: ids.securityKbId,
        version_id: ids.incidentRunbookVersionId,
        job_id: ids.incidentJobId,
        outbox_id: ids.incidentOutboxId,
        title: 'Runbook Confidencial CSIRT — Cuarentena ClamAV y RustFS',
        original_filename: 'runbook-csirt-clamav-rustfs.md',
        visibility: 'private',
        chunks: [
          {
            id: ids.incidentChunk1Id,
            ordinal: 0,
            content:
              'Los archivos binarios subidos ingresan inicialmente al prefijo quarantine/ en RustFS S3 privado y son inspeccionados por ClamAV mediante protocolo TCP INSTREAM antes de cualquier extracción o indexación vectorial.',
          },
          {
            id: ids.incidentChunk2Id,
            ordinal: 1,
            content:
              'Ante una firma maliciosa detectada por ClamAV, el worker marca el documento como failed, emite el evento de auditoría document.malware_blocked y programa el borrado físico inmediato en storage_deletions sin promover el objeto a clean/.',
          },
        ],
      },
      {
        doc_id: ids.finopsManualDocId,
        kb_id: ids.finopsKbId,
        version_id: ids.finopsManualVersionId,
        job_id: ids.finopsJobId,
        outbox_id: ids.finopsOutboxId,
        title: 'Manual de Gobernanza FinOps y Presupuestos Atómicos de Inferencia',
        original_filename: 'manual-finops-presupuestos-ia.md',
        visibility: 'tenant',
        chunks: [
          {
            id: ids.finopsChunk1Id,
            ordinal: 0,
            content:
              'El control presupuestario diario por organización se ejecuta de forma atómica en PostgreSQL mediante la función SECURITY DEFINER reserve_tenant_answer_budget con bloqueo transaccional FOR UPDATE sobre el tenant.',
          },
          {
            id: ids.finopsChunk2Id,
            ordinal: 1,
            content:
              'La arquitectura híbrida combina embeddings densos Qwen3-Embedding-0.6B de 1024 dimensiones en índices HNSW pgvector con búsqueda léxica tsvector, fusión RRF k=60 y generación local con Qwen2.5:3b.',
          },
        ],
      },
    ];

    await this.ctx.withActorDb(actors.owner.sub, async (db) => {
      await db
        .insert(tenants)
        .values({
          id: tenant_id,
          name: 'Atlas Corporación Financiera — Demo',
          created_by_sub: actors.owner.sub,
        })
        .onConflictDoUpdate({
          target: tenants.id,
          set: { name: 'Atlas Corporación Financiera — Demo' },
        });

      await db
        .insert(memberships)
        .values({
          tenant_id,
          user_sub: actors.owner.sub,
          role: 'owner',
        })
        .onConflictDoNothing({
          target: [memberships.tenant_id, memberships.user_sub],
        });

      await db
        .insert(knowledge_bases)
        .values([
          {
            id: ids.securityKbId,
            tenant_id,
            name: 'Normativa de Ciberseguridad y Zero Trust 2026',
            created_by_sub: actors.owner.sub,
          },
          {
            id: ids.finopsKbId,
            tenant_id,
            name: 'Arquitectura Financiera y FinOps IA',
            created_by_sub: actors.owner.sub,
          },
        ])
        .onConflictDoUpdate({
          target: knowledge_bases.id,
          set: { name: sql`excluded.name` },
        });

      for (const fixture of docFixtures) {
        const fullBody = fixture.chunks.map((chunk) => chunk.content).join('\n\n');
        const digest = sha256Hex(fullBody);
        const byteSize = Buffer.byteLength(fullBody, 'utf8');

        await db
          .insert(documents)
          .values({
            id: fixture.doc_id,
            tenant_id,
            knowledge_base_id: fixture.kb_id,
            owner_sub: actors.owner.sub,
            title: fixture.title,
            body: fullBody,
            visibility: fixture.visibility,
            status: 'queued',
            version: 1,
            original_filename: fixture.original_filename,
            media_type: 'text/markdown',
            file_sha256: digest,
            byte_size: byteSize,
          })
          .onConflictDoUpdate({
            target: documents.id,
            set: {
              title: fixture.title,
              body: fullBody,
              visibility: fixture.visibility,
              original_filename: fixture.original_filename,
              media_type: 'text/markdown',
              file_sha256: digest,
              byte_size: byteSize,
            },
          });

        await db
          .insert(ingestion_jobs)
          .values({
            id: fixture.job_id,
            document_id: fixture.doc_id,
            status: 'pending',
            stage: 'queued',
            attempts: 1,
          })
          .onConflictDoNothing({
            target: ingestion_jobs.document_id,
          });

        await db
          .insert(outbox_events)
          .values({
            id: fixture.outbox_id,
            tenant_id,
            topic: 'ingestion.requested',
            aggregate_id: fixture.doc_id,
            payload: { jobId: fixture.job_id, documentId: fixture.doc_id, seeded: true },
            status: 'pending',
          })
          .onConflictDoNothing({
            target: outbox_events.id,
          });
      }
    });

    // 3. Worker role (`rag_worker`) indexes chunks (with optional 1024d Qwen3 embeddings) & marks jobs/documents ready.
    const allChunks = docFixtures.flatMap((doc) =>
      doc.chunks.map((chunk) => ({
        ...chunk,
        doc_id: doc.doc_id,
      })),
    );
    const vectors = await this.ctx.embedBatch(allChunks.map((chunk) => chunk.content));

    await this.ctx.withWorkerDb(async (db, client) => {
      for (let i = 0; i < allChunks.length; i += 1) {
        const chunk = allChunks[i];
        const vec = vectors[i] ?? null;
        const vecLiteral = vec ? `[${vec.join(',')}]` : null;
        const modelLabel = vec ? this.ctx.embeddingModelName : null;

        await client.query(
          `INSERT INTO document_chunks (
             id, tenant_id, document_id, ordinal, content, vector, document_version, embedding_model
           )
           VALUES ($1, $2, $3, $4, $5, $6::vector, 1, $7)
           ON CONFLICT (document_id, ordinal) DO UPDATE
           SET content = EXCLUDED.content,
               vector = COALESCE(EXCLUDED.vector, document_chunks.vector),
               document_version = EXCLUDED.document_version,
               embedding_model = COALESCE(EXCLUDED.embedding_model, document_chunks.embedding_model)`,
          [chunk.id, tenant_id, chunk.doc_id, chunk.ordinal, chunk.content, vecLiteral, modelLabel],
        );
      }

      const now = new Date();
      for (const fixture of docFixtures) {
        const fullBody = fixture.chunks.map((chunk) => chunk.content).join('\n\n');
        const digest = sha256Hex(fullBody);

        await db
          .insert(document_versions)
          .values({
            id: fixture.version_id,
            document_id: fixture.doc_id,
            tenant_id,
            version: 1,
            sha256: digest,
            media_type: 'text/markdown',
            original_filename: fixture.original_filename,
          })
          .onConflictDoNothing({
            target: [document_versions.document_id, document_versions.version],
          });

        await db.update(documents).set({ status: 'ready' }).where(eq(documents.id, fixture.doc_id));
        await db
          .update(ingestion_jobs)
          .set({
            status: 'completed',
            stage: 'indexed',
            attempts: 1,
            error_message: null,
            lease_token: null,
            lease_expires_at: null,
            completed_at: now,
            updated_at: now,
          })
          .where(eq(ingestion_jobs.document_id, fixture.doc_id));

        await db
          .update(outbox_events)
          .set({
            status: 'dispatched',
            attempts: 1,
            dispatched_at: now,
          })
          .where(eq(outbox_events.id, fixture.outbox_id));

        await db
          .insert(processed_events)
          .values({
            event_key: `ingestion:${fixture.doc_id}:v1`,
            topic: 'ingestion.requested',
          })
          .onConflictDoNothing({
            target: processed_events.event_key,
          });
      }
    });
  }
}

export async function seedKnowledge(ctx: SeedExecutionContext): Promise<void> {
  await new KnowledgeSeeder(ctx).run();
}
