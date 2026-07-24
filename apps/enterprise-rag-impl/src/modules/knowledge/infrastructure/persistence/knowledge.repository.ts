import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, desc, eq, isNotNull, isNull, sql } from 'drizzle-orm';
import { withActor } from '../../../../database/pool';
import {
  audit_events,
  documents,
  ingestion_jobs,
  knowledge_bases,
  memberships,
  outbox_events,
  storage_deletions,
  tenants,
  users,
} from '../../../../database/schema';
import type { Actor } from '../../../../security/actor';
import type {
  CountedRows,
  KnowledgeRepositoryPort,
  PaginationWindow,
} from '../../application/ports/knowledge-repository.port';
import type { DocumentVisibilitySchema } from '../../domain/schemas/document.schema';
import type {
  DocumentStatusResponseDto,
  DocumentSummaryResponseDto,
  KnowledgeBaseResponseDto,
  TenantResponseDto,
} from '../../presentation/http/dto/knowledge.dto';

@Injectable()
export class PostgresKnowledgeRepository implements KnowledgeRepositoryPort {
  async getActorProfile(actor: Actor): Promise<Actor> {
    return withActor(actor.sub, async (db) => {
      await db
        .insert(users)
        .values({ sub: actor.sub, email: actor.email })
        .onConflictDoUpdate({
          target: users.sub,
          set: {
            email: sql`COALESCE(EXCLUDED.email, ${users.email})`,
          },
        });
      return actor;
    });
  }

  async me(actor: Actor): Promise<Actor> {
    return this.getActorProfile(actor);
  }

  async listTenants(
    actor_sub: string,
    pagination: PaginationWindow = { limit: 25, offset: 0 },
  ): Promise<CountedRows<TenantResponseDto>> {
    return withActor(actor_sub, async (db) => {
      const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(tenants);
      const results = await db
        .select({ id: tenants.id, name: tenants.name })
        .from(tenants)
        .orderBy(desc(tenants.created_at), asc(tenants.id))
        .limit(pagination.limit)
        .offset(pagination.offset);
      return { count: count ?? 0, results };
    });
  }

  async tenants(
    actor_sub: string,
    pagination: PaginationWindow = { limit: 25, offset: 0 },
  ): Promise<CountedRows<TenantResponseDto>> {
    return this.listTenants(actor_sub, pagination);
  }

  async createTenant(actor_sub: string, name: string): Promise<TenantResponseDto> {
    return withActor(actor_sub, async (db) => {
      await db.insert(users).values({ sub: actor_sub }).onConflictDoNothing();
      const [found] = await db
        .insert(tenants)
        .values({ name, created_by_sub: actor_sub })
        .returning({ id: tenants.id, name: tenants.name });
      await db.insert(memberships).values({
        tenant_id: found.id,
        user_sub: actor_sub,
        role: 'owner',
      });
      await db.insert(audit_events).values({
        tenant_id: found.id,
        actor_sub,
        action: 'tenant.created',
        target_type: 'tenant',
        target_id: found.id,
      });
      return found;
    });
  }

  async listKnowledgeBases(
    actor_sub: string,
    tenant_id: string,
    pagination: PaginationWindow = { limit: 25, offset: 0 },
  ): Promise<CountedRows<KnowledgeBaseResponseDto>> {
    return withActor(actor_sub, async (db) => {
      const [{ count }] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(knowledge_bases)
        .where(eq(knowledge_bases.tenant_id, tenant_id));
      const results = await db
        .select({
          id: knowledge_bases.id,
          tenant_id: knowledge_bases.tenant_id,
          name: knowledge_bases.name,
        })
        .from(knowledge_bases)
        .where(eq(knowledge_bases.tenant_id, tenant_id))
        .orderBy(asc(knowledge_bases.name))
        .limit(pagination.limit)
        .offset(pagination.offset);
      return { count: count ?? 0, results };
    });
  }

  async knowledgeBases(
    actor_sub: string,
    tenant_id: string,
    pagination: PaginationWindow = { limit: 25, offset: 0 },
  ): Promise<CountedRows<KnowledgeBaseResponseDto>> {
    return this.listKnowledgeBases(actor_sub, tenant_id, pagination);
  }

  async createKnowledgeBase(
    actor_sub: string,
    tenant_id: string,
    name: string,
  ): Promise<KnowledgeBaseResponseDto> {
    return withActor(actor_sub, async (db) => {
      const [found] = await db
        .insert(knowledge_bases)
        .values({ tenant_id, name, created_by_sub: actor_sub })
        .returning({
          id: knowledge_bases.id,
          tenant_id: knowledge_bases.tenant_id,
          name: knowledge_bases.name,
        });
      await db.insert(audit_events).values({
        tenant_id,
        actor_sub,
        action: 'knowledge_base.created',
        target_type: 'knowledge_base',
        target_id: found.id,
      });
      return found;
    });
  }

  async updateKnowledgeBase(
    actor_sub: string,
    knowledge_base_id: string,
    name: string,
  ): Promise<KnowledgeBaseResponseDto> {
    return withActor(actor_sub, async (db) => {
      const [updated] = await db
        .update(knowledge_bases)
        .set({ name })
        .where(eq(knowledge_bases.id, knowledge_base_id))
        .returning({
          id: knowledge_bases.id,
          tenant_id: knowledge_bases.tenant_id,
          name: knowledge_bases.name,
        });
      if (!updated) {
        throw new NotFoundException('Knowledge base not found or insufficient permissions');
      }
      await db.insert(audit_events).values({
        tenant_id: updated.tenant_id,
        actor_sub,
        action: 'knowledge_base.updated',
        target_type: 'knowledge_base',
        target_id: knowledge_base_id,
      });
      return updated;
    });
  }

  async deleteKnowledgeBase(actor_sub: string, knowledge_base_id: string): Promise<{ deleted: boolean }> {
    return withActor(actor_sub, async (db, client) => {
      const [knowledgeBaseRow] = await db
        .select({ id: knowledge_bases.id, tenant_id: knowledge_bases.tenant_id })
        .from(knowledge_bases)
        .where(eq(knowledge_bases.id, knowledge_base_id));
      if (!knowledgeBaseRow) {
        throw new NotFoundException('Knowledge base not found');
      }
      const check = await client.query<{ ok: boolean }>('SELECT is_tenant_manager($1::uuid) AS ok', [
        knowledgeBaseRow.tenant_id,
      ]);
      if (!check.rows[0]?.ok) {
        throw new ForbiddenException('Manager role required to delete knowledge base');
      }
      const files = await db
        .select({ id: documents.id, file_path: documents.file_path })
        .from(documents)
        .where(and(eq(documents.knowledge_base_id, knowledge_base_id), isNotNull(documents.file_path)));
      for (const fileItem of files) {
        if (fileItem.file_path) {
          await db
            .insert(storage_deletions)
            .values({ document_id: fileItem.id, object_key: fileItem.file_path })
            .onConflictDoNothing();
        }
      }
      await db.delete(knowledge_bases).where(eq(knowledge_bases.id, knowledge_base_id));
      await db.insert(audit_events).values({
        tenant_id: knowledgeBaseRow.tenant_id,
        actor_sub,
        action: 'knowledge_base.deleted',
        target_type: 'knowledge_base',
        target_id: knowledge_base_id,
      });
      return { deleted: true };
    });
  }

  async listDocuments(
    actor_sub: string,
    knowledge_base_id: string,
    pagination: PaginationWindow = { limit: 25, offset: 0 },
  ): Promise<CountedRows<DocumentSummaryResponseDto>> {
    return withActor(actor_sub, async (db) => {
      const [{ count }] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(documents)
        .where(and(eq(documents.knowledge_base_id, knowledge_base_id), isNull(documents.deleted_at)));
      const results = await db
        .select({
          id: documents.id,
          title: documents.title,
          visibility: documents.visibility,
          status: documents.status,
          created_at: documents.created_at,
        })
        .from(documents)
        .where(and(eq(documents.knowledge_base_id, knowledge_base_id), isNull(documents.deleted_at)))
        .orderBy(desc(documents.created_at), asc(documents.id))
        .limit(pagination.limit)
        .offset(pagination.offset);
      return { count: count ?? 0, results };
    });
  }

  async documents(
    actor_sub: string,
    knowledge_base_id: string,
    pagination: PaginationWindow = { limit: 25, offset: 0 },
  ): Promise<CountedRows<DocumentSummaryResponseDto>> {
    return this.listDocuments(actor_sub, knowledge_base_id, pagination);
  }

  async createTextDocument(
    actor_sub: string,
    knowledge_base_id: string,
    title: string,
    text: string,
    visibility: DocumentVisibilitySchema,
  ): Promise<DocumentStatusResponseDto> {
    return withActor(actor_sub, async (db, client) => {
      const [knowledgeBaseRow] = await db
        .select({ tenant_id: knowledge_bases.tenant_id })
        .from(knowledge_bases)
        .where(eq(knowledge_bases.id, knowledge_base_id));
      if (!knowledgeBaseRow) {
        throw new NotFoundException('Knowledge base not found');
      }
      const countResult = await client.query<{ n: number }>(
        'SELECT count_active_kb_documents($1::uuid)::int AS n',
        [knowledge_base_id],
      );
      const activeDocumentCount = countResult.rows[0]?.n ?? 0;
      if (activeDocumentCount >= 100) {
        throw new ForbiddenException('Knowledge base document limit reached');
      }
      const byte_size = Buffer.byteLength(text, 'utf8');
      const [result] = await db
        .insert(documents)
        .values({
          tenant_id: knowledgeBaseRow.tenant_id,
          knowledge_base_id,
          owner_sub: actor_sub,
          title,
          body: text,
          visibility,
          media_type: 'text/plain',
          byte_size,
        })
        .returning({ id: documents.id, status: documents.status });
      const [job] = await db
        .insert(ingestion_jobs)
        .values({
          document_id: result.id,
          status: 'pending',
          stage: 'queued',
        })
        .returning({ id: ingestion_jobs.id });
      await db.insert(outbox_events).values({
        tenant_id: knowledgeBaseRow.tenant_id,
        topic: 'document.ingestion.requested',
        aggregate_id: result.id,
        payload: { document_id: result.id, job_id: job.id },
      });
      await db.insert(audit_events).values({
        tenant_id: knowledgeBaseRow.tenant_id,
        actor_sub,
        action: 'document.created',
        target_type: 'document',
        target_id: result.id,
      });
      return result;
    });
  }

  async createDocument(
    actor_sub: string,
    knowledge_base_id: string,
    title: string,
    text: string,
    visibility: DocumentVisibilitySchema,
  ): Promise<DocumentStatusResponseDto> {
    return this.createTextDocument(actor_sub, knowledge_base_id, title, text, visibility);
  }
}

export const PgKnowledgeRepository = PostgresKnowledgeRepository;
