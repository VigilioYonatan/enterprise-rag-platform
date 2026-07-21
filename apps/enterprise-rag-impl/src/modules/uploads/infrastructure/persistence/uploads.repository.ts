import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { and, eq, inArray, isNull, sql } from 'drizzle-orm';
import { withActor } from '../../../../database/pool';
import {
  audit_events,
  document_chunks,
  documents,
  ingestion_jobs,
  knowledge_bases,
  memberships,
  outbox_events,
  storage_deletions,
} from '../../../../database/schema';
import {
  removePrivateObject,
  retrievePrivateObject,
  storePrivateObject,
} from '../../../../storage/object-storage';
import type {
  CreateNewVersionParams,
  CreateUploadedDocumentParams,
  ObjectStoragePort,
  UploadsRepositoryPort,
} from '../../application/ports/uploads-repository.port';

@Injectable()
export class RustFsObjectStorageAdapter implements ObjectStoragePort {
  storePrivateObject(key: string, body: Buffer, mediaType: string): Promise<void> {
    return storePrivateObject(key, body, mediaType);
  }
  retrievePrivateObject(key: string): Promise<Buffer> {
    return retrievePrivateObject(key);
  }
  removePrivateObject(key: string): Promise<void> {
    return removePrivateObject(key);
  }
}

@Injectable()
export class PostgresUploadsRepository implements UploadsRepositoryPort {
  async assertCanUploadToKnowledgeBase(actor_sub: string, kb_id: string): Promise<void> {
    await withActor(actor_sub, async (db) => {
      const [row] = await db
        .select({ id: knowledge_bases.id })
        .from(knowledge_bases)
        .innerJoin(
          memberships,
          and(eq(memberships.tenant_id, knowledge_bases.tenant_id), eq(memberships.user_sub, actor_sub)),
        )
        .where(and(eq(knowledge_bases.id, kb_id), inArray(memberships.role, ['owner', 'admin'])));
      if (!row) {
        throw new NotFoundException('Knowledge base unavailable or insufficient permissions');
      }
    });
  }

  async assertCanVersionDocument(actor_sub: string, document_id: string): Promise<{ tenant_id: string }> {
    return withActor(actor_sub, async (db, client) => {
      const [doc] = await db
        .select({ tenant_id: documents.tenant_id, owner_sub: documents.owner_sub })
        .from(documents)
        .where(and(eq(documents.id, document_id), isNull(documents.deleted_at)));
      if (!doc) {
        throw new NotFoundException('Document unavailable');
      }
      const { tenant_id, owner_sub } = doc;
      if (owner_sub !== actor_sub) {
        const check = await client.query<{ ok: boolean }>('SELECT is_tenant_manager($1::uuid) AS ok', [
          tenant_id,
        ]);
        if (!check.rows[0]?.ok) {
          throw new ForbiddenException('Only document owner or tenant manager can upload a new version');
        }
      }
      return { tenant_id };
    });
  }

  async persistUploadedDocument(
    params: CreateUploadedDocumentParams,
  ): Promise<{ id: string; status: string }> {
    return withActor(params.sub, async (db, client) => {
      const [tenant] = await db
        .select({ tenant_id: knowledge_bases.tenant_id })
        .from(knowledge_bases)
        .innerJoin(
          memberships,
          and(eq(memberships.tenant_id, knowledge_bases.tenant_id), eq(memberships.user_sub, params.sub)),
        )
        .where(and(eq(knowledge_bases.id, params.kb_id), inArray(memberships.role, ['owner', 'admin'])));
      if (!tenant) {
        throw new NotFoundException('Access revoked during upload');
      }
      const countResult = await client.query<{ n: number }>(
        'SELECT count_active_kb_documents($1::uuid)::int AS n',
        [params.kb_id],
      );
      const n = countResult.rows[0]?.n ?? 0;
      if (n >= 100) {
        throw new BadRequestException('Knowledge base document limit reached');
      }
      const [row] = await db
        .insert(documents)
        .values({
          tenant_id: tenant.tenant_id,
          knowledge_base_id: params.kb_id,
          owner_sub: params.sub,
          title: params.title,
          body: '',
          visibility: params.visibility,
          original_filename: params.original_filename,
          media_type: params.media_type,
          file_path: params.object_key,
          file_sha256: params.sha256,
          byte_size: params.byte_size,
        })
        .returning({ id: documents.id, status: documents.status });

      const [job] = await db
        .insert(ingestion_jobs)
        .values({
          document_id: row.id,
          status: 'pending',
          stage: 'queued',
        })
        .returning({ id: ingestion_jobs.id });

      await db.insert(outbox_events).values({
        tenant_id: tenant.tenant_id,
        topic: 'document.ingestion.requested',
        aggregate_id: row.id,
        payload: { document_id: row.id, job_id: job.id },
      });

      await db.insert(audit_events).values({
        tenant_id: tenant.tenant_id,
        actor_sub: params.sub,
        action: 'document.uploaded',
        target_type: 'document',
        target_id: row.id,
      });

      return row;
    });
  }

  async persistNewDocumentVersion(
    params: CreateNewVersionParams,
  ): Promise<{ id: string; version: number; status: string }> {
    return withActor(params.sub, async (db, client) => {
      const [doc] = await db
        .select({
          id: documents.id,
          tenant_id: documents.tenant_id,
          owner_sub: documents.owner_sub,
          file_path: documents.file_path,
        })
        .from(documents)
        .where(and(eq(documents.id, params.document_id), isNull(documents.deleted_at)))
        .for('update');
      if (!doc) {
        throw new NotFoundException('Document unavailable');
      }
      if (doc.owner_sub !== params.sub) {
        const check = await client.query<{ ok: boolean }>('SELECT is_tenant_manager($1::uuid) AS ok', [
          doc.tenant_id,
        ]);
        if (!check.rows[0]?.ok) {
          throw new ForbiddenException('Only document owner or tenant manager can upload a new version');
        }
      }

      if (doc.file_path) {
        await db
          .insert(storage_deletions)
          .values({ document_id: doc.id, object_key: doc.file_path })
          .onConflictDoNothing();
      }

      // Immediately purge old chunks and increment document.version so previous citations are fenced off atomically.
      await db.delete(document_chunks).where(eq(document_chunks.document_id, doc.id));

      const [updated] = await db
        .update(documents)
        .set({
          version: sql`${documents.version} + 1`,
          title: params.title ?? documents.title,
          body: params.object_key ? '' : (params.text ?? ''),
          status: 'queued',
          file_path: params.object_key,
          file_sha256: params.sha256,
          byte_size: params.byte_size,
          media_type: params.media_type,
          original_filename: params.original_filename ?? null,
        })
        .where(eq(documents.id, doc.id))
        .returning({ id: documents.id, version: documents.version, status: documents.status });

      const [existingJob] = await db
        .update(ingestion_jobs)
        .set({
          status: 'pending',
          stage: 'queued',
          attempts: 0,
          error_message: null,
          lease_token: null,
          lease_expires_at: null,
          next_attempt_at: new Date(),
          completed_at: null,
          updated_at: new Date(),
        })
        .where(eq(ingestion_jobs.document_id, doc.id))
        .returning({ id: ingestion_jobs.id });

      const jobId = existingJob
        ? existingJob.id
        : (
            await db
              .insert(ingestion_jobs)
              .values({ document_id: doc.id, status: 'pending', stage: 'queued' })
              .returning({ id: ingestion_jobs.id })
          )[0].id;

      await db.insert(outbox_events).values({
        tenant_id: doc.tenant_id,
        topic: 'document.ingestion.requested',
        aggregate_id: doc.id,
        payload: { document_id: doc.id, job_id: jobId, version: updated.version },
      });

      await db.insert(audit_events).values({
        tenant_id: doc.tenant_id,
        actor_sub: params.sub,
        action: 'document.version_uploaded',
        target_type: 'document',
        target_id: doc.id,
      });

      return updated;
    });
  }

  async getAuthorizedDownloadTarget(
    actor_sub: string,
    document_id: string,
  ): Promise<{ file_path: string; original_filename: string | null; media_type: string | null }> {
    return withActor(actor_sub, async (db) => {
      const [row] = await db
        .select({
          file_path: documents.file_path,
          original_filename: documents.original_filename,
          media_type: documents.media_type,
        })
        .from(documents)
        .where(
          and(
            eq(documents.id, document_id),
            isNull(documents.deleted_at),
            eq(documents.status, 'ready'),
            sql`can_read_document(${documents.id})`,
          ),
        );
      if (!row?.file_path) {
        throw new NotFoundException('Document unavailable');
      }
      return {
        file_path: row.file_path,
        original_filename: row.original_filename,
        media_type: row.media_type,
      };
    });
  }

  async reverifyAuthorizedDownloadTarget(
    actor_sub: string,
    document_id: string,
    file_path: string,
  ): Promise<boolean> {
    return withActor(actor_sub, async (db) => {
      const [current] = await db
        .select({ id: documents.id })
        .from(documents)
        .where(
          and(
            eq(documents.id, document_id),
            eq(documents.file_path, file_path),
            isNull(documents.deleted_at),
            eq(documents.status, 'ready'),
            sql`can_read_document(${documents.id})`,
          ),
        );
      return Boolean(current);
    });
  }
}

export const PgUploadsRepository = PostgresUploadsRepository;
