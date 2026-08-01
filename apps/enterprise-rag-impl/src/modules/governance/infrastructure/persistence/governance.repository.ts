import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, desc, eq, inArray, isNull, sql } from 'drizzle-orm';
import { withActor } from '../../../../database/pool';
import {
  access_group_memberships,
  access_groups,
  audit_events,
  document_chunks,
  document_grants,
  document_group_grants,
  document_versions,
  documents,
  ingestion_jobs,
  memberships,
  outbox_events,
  storage_deletions,
  tenant_budgets,
  usage_events,
  users,
} from '../../../../database/schema';
import type { CountedRows, PaginationWindow } from '../../../../shared/types/pagination.type';
import type { GovernanceRepositoryPort } from '../../application/ports/governance-repository.port';
import type { DlqSourceSchema } from '../../domain/schemas/dlq-item.schema';
import type { TenantMemberSchema, TenantRoleSchema } from '../../domain/schemas/tenant-member.schema';
import type {
  AuditEventItemResponseDto,
  DlqItemResponseDto,
  DocumentChunkResponseDto,
  DocumentDetailResponseDto,
  DocumentVersionResponseDto,
  IngestionJobResponseDto,
  MemberResponseDto,
  TenantBudgetResponseDto,
  UsageSummaryItemResponseDto,
} from '../../presentation/http/dto/governance.dto';

@Injectable()
export class PostgresGovernanceRepository implements GovernanceRepositoryPort {
  listMembers(
    actor_sub: string,
    tenant_id: string,
    pagination: PaginationWindow = { limit: 25, offset: 0 },
  ): Promise<CountedRows<MemberResponseDto>> {
    return this.members(actor_sub, tenant_id, pagination);
  }

  async members(
    actor_sub: string,
    tenant_id: string,
    pagination: PaginationWindow = { limit: 25, offset: 0 },
  ): Promise<CountedRows<MemberResponseDto>> {
    return withActor(actor_sub, async (db) => {
      const [membership] = await db
        .select({ user_sub: memberships.user_sub })
        .from(memberships)
        .where(and(eq(memberships.tenant_id, tenant_id), eq(memberships.user_sub, actor_sub)));
      if (!membership) {
        throw new NotFoundException('Tenant not found');
      }
      const [{ count }] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(memberships)
        .where(eq(memberships.tenant_id, tenant_id));
      const rows = await db
        .select({
          user_sub: memberships.user_sub,
          email: users.email,
          role: memberships.role,
        })
        .from(memberships)
        .leftJoin(users, eq(users.sub, memberships.user_sub))
        .where(eq(memberships.tenant_id, tenant_id))
        .orderBy(
          sql`CASE ${memberships.role} WHEN 'owner' THEN 0 WHEN 'admin' THEN 1 ELSE 2 END`,
          sql`${users.email} NULLS LAST`,
          asc(memberships.user_sub),
        )
        .limit(pagination.limit)
        .offset(pagination.offset);
      return { count: count ?? 0, results: rows };
    });
  }

  changeMemberRole(
    actor_sub: string,
    tenant_id: string,
    user_sub: string,
    role: TenantRoleSchema,
  ): Promise<{ user_sub: string; role: TenantRoleSchema }> {
    return this.changeRole(actor_sub, tenant_id, user_sub, role);
  }

  async changeRole(
    actor_sub: string,
    tenant_id: string,
    user_sub: string,
    role: TenantRoleSchema,
  ): Promise<{ user_sub: string; role: TenantRoleSchema }> {
    return withActor(actor_sub, async (db) => {
      const [authorized] = await db
        .select({ role: memberships.role })
        .from(memberships)
        .where(and(eq(memberships.tenant_id, tenant_id), eq(memberships.user_sub, actor_sub)))
        .for('update');
      if (authorized?.role !== 'owner') {
        throw new ForbiddenException('Only tenant owner can manage roles');
      }
      const [target] = await db
        .select({ role: memberships.role })
        .from(memberships)
        .where(and(eq(memberships.tenant_id, tenant_id), eq(memberships.user_sub, user_sub)))
        .for('update');
      if (!target) {
        throw new NotFoundException('Member not found');
      }
      if (target.role === 'owner' && role !== 'owner') {
        const [{ total }] = await db
          .select({ total: sql<number>`count(*)::int` })
          .from(memberships)
          .where(and(eq(memberships.tenant_id, tenant_id), eq(memberships.role, 'owner')));
        if ((total ?? 0) < 2) {
          throw new BadRequestException('Cannot remove last owner');
        }
      }
      const [updated] = await db
        .update(memberships)
        .set({ role })
        .where(and(eq(memberships.tenant_id, tenant_id), eq(memberships.user_sub, user_sub)))
        .returning({ user_sub: memberships.user_sub, role: memberships.role });
      await db.insert(audit_events).values({
        tenant_id,
        actor_sub,
        action: 'membership.role_changed',
        target_type: 'member',
        target_id: user_sub,
      });
      return { user_sub: updated.user_sub, role: updated.role };
    });
  }

  async removeMember(actor_sub: string, tenant_id: string, user_sub: string): Promise<{ removed: boolean }> {
    return withActor(actor_sub, async (db) => {
      const [caller] = await db
        .select({ role: memberships.role })
        .from(memberships)
        .where(and(eq(memberships.tenant_id, tenant_id), eq(memberships.user_sub, actor_sub)))
        .for('update');
      const callerRole = caller?.role;
      if (callerRole !== 'owner' && callerRole !== 'admin') {
        throw new ForbiddenException('Manager role required');
      }
      const [target] = await db
        .select({ role: memberships.role })
        .from(memberships)
        .where(and(eq(memberships.tenant_id, tenant_id), eq(memberships.user_sub, user_sub)))
        .for('update');
      if (!target) {
        throw new NotFoundException('Member not found');
      }
      if (target.role !== 'viewer' && callerRole !== 'owner') {
        throw new ForbiddenException('Only tenant owner can remove an owner or admin');
      }
      if (target.role === 'owner') {
        const [{ total }] = await db
          .select({ total: sql<number>`count(*)::int` })
          .from(memberships)
          .where(and(eq(memberships.tenant_id, tenant_id), eq(memberships.role, 'owner')));
        if ((total ?? 0) < 2) {
          throw new BadRequestException('Cannot remove last owner');
        }
      }
      await db
        .delete(access_group_memberships)
        .where(
          and(
            eq(access_group_memberships.tenant_id, tenant_id),
            eq(access_group_memberships.user_sub, user_sub),
          ),
        );
      await db
        .delete(document_grants)
        .where(and(eq(document_grants.tenant_id, tenant_id), eq(document_grants.user_sub, user_sub)));
      await db
        .delete(memberships)
        .where(and(eq(memberships.tenant_id, tenant_id), eq(memberships.user_sub, user_sub)));
      await db.insert(audit_events).values({
        tenant_id,
        actor_sub,
        action: 'membership.removed',
        target_type: 'member',
        target_id: user_sub,
      });
      return { removed: true };
    });
  }

  getDocumentDetail(actor_sub: string, document_id: string): Promise<DocumentDetailResponseDto> {
    return this.document(actor_sub, document_id);
  }

  async document(actor_sub: string, document_id: string): Promise<DocumentDetailResponseDto> {
    return withActor(actor_sub, async (db) => {
      const [doc] = await db
        .select({
          id: documents.id,
          tenant_id: documents.tenant_id,
          knowledge_base_id: documents.knowledge_base_id,
          title: documents.title,
          visibility: documents.visibility,
          status: documents.status,
          version: documents.version,
          owner_sub: documents.owner_sub,
          created_at: documents.created_at,
          media_type: documents.media_type,
          original_filename: documents.original_filename,
          byte_size: documents.byte_size,
        })
        .from(documents)
        .where(and(eq(documents.id, document_id), isNull(documents.deleted_at)));
      if (!doc) {
        throw new NotFoundException('Document not available');
      }
      return doc;
    });
  }

  listDocumentVersions(
    actor_sub: string,
    document_id: string,
    pagination: PaginationWindow = { limit: 25, offset: 0 },
  ): Promise<CountedRows<DocumentVersionResponseDto>> {
    return this.versions(actor_sub, document_id, pagination);
  }

  async versions(
    actor_sub: string,
    document_id: string,
    pagination: PaginationWindow = { limit: 25, offset: 0 },
  ): Promise<CountedRows<DocumentVersionResponseDto>> {
    return withActor(actor_sub, async (db) => {
      const [doc] = await db
        .select({ id: documents.id })
        .from(documents)
        .where(and(eq(documents.id, document_id), isNull(documents.deleted_at)));
      if (!doc) {
        throw new NotFoundException('Document not available');
      }
      const [{ count }] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(document_versions)
        .where(eq(document_versions.document_id, document_id));
      const results = await db
        .select({
          id: document_versions.id,
          version: document_versions.version,
          sha256: document_versions.sha256,
          media_type: document_versions.media_type,
          original_filename: document_versions.original_filename,
          created_at: document_versions.created_at,
        })
        .from(document_versions)
        .where(eq(document_versions.document_id, document_id))
        .orderBy(desc(document_versions.version))
        .limit(pagination.limit)
        .offset(pagination.offset);
      return { count: count ?? 0, results };
    });
  }

  listDocumentChunks(
    actor_sub: string,
    document_id: string,
    pagination: PaginationWindow = { limit: 25, offset: 0 },
  ): Promise<CountedRows<DocumentChunkResponseDto>> {
    return this.documentChunks(actor_sub, document_id, pagination);
  }

  async documentChunks(
    actor_sub: string,
    document_id: string,
    pagination: PaginationWindow = { limit: 25, offset: 0 },
  ): Promise<CountedRows<DocumentChunkResponseDto>> {
    return withActor(actor_sub, async (db) => {
      const [doc] = await db
        .select({ id: documents.id })
        .from(documents)
        .where(
          and(eq(documents.id, document_id), eq(documents.status, 'ready'), isNull(documents.deleted_at)),
        );
      if (!doc) {
        throw new NotFoundException('Document not ready or unauthorized');
      }
      const [{ count }] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(document_chunks)
        .where(eq(document_chunks.document_id, document_id));
      const results = await db
        .select({
          id: document_chunks.id,
          ordinal: document_chunks.ordinal,
          content: document_chunks.content,
          document_version: document_chunks.document_version,
        })
        .from(document_chunks)
        .where(eq(document_chunks.document_id, document_id))
        .orderBy(asc(document_chunks.ordinal))
        .limit(pagination.limit)
        .offset(pagination.offset);
      return { count: count ?? 0, results };
    });
  }

  listDocumentGrants(
    actor_sub: string,
    document_id: string,
  ): Promise<Array<{ user_sub: string; email: string | null; created_at: Date }>> {
    return this.grants(actor_sub, document_id);
  }

  async grants(
    actor_sub: string,
    document_id: string,
  ): Promise<Array<{ user_sub: string; email: string | null; created_at: Date }>> {
    return withActor(actor_sub, async (db, client) => {
      const [doc] = await db
        .select({ id: documents.id, tenant_id: documents.tenant_id, owner_sub: documents.owner_sub })
        .from(documents)
        .where(and(eq(documents.id, document_id), isNull(documents.deleted_at)));
      if (!doc) {
        throw new NotFoundException('Document not available');
      }
      if (doc.owner_sub !== actor_sub) {
        const check = await client.query<{ ok: boolean }>('SELECT is_tenant_manager($1::uuid) AS ok', [
          doc.tenant_id,
        ]);
        if (!check.rows[0]?.ok) {
          throw new ForbiddenException('Only document owner or tenant manager can view grants');
        }
      }
      const rows = await client.query<{ user_sub: string; email: string | null; created_at: Date }>(
        'SELECT user_sub, email, created_at FROM list_document_grants_for_actor($1::uuid)',
        [document_id],
      );
      return rows.rows;
    });
  }

  replaceDocumentGrants(
    actor_sub: string,
    document_id: string,
    user_subs: string[],
  ): Promise<{ document_id: string; granted_users: number }> {
    return this.replaceGrants(actor_sub, document_id, user_subs);
  }

  async replaceGrants(
    actor_sub: string,
    document_id: string,
    user_subs: string[],
  ): Promise<{ document_id: string; granted_users: number }> {
    return withActor(actor_sub, async (db, client) => {
      const [doc] = await db
        .select({ tenant_id: documents.tenant_id, owner_sub: documents.owner_sub })
        .from(documents)
        .where(and(eq(documents.id, document_id), isNull(documents.deleted_at)))
        .for('update');
      if (!doc) {
        throw new NotFoundException('Document not available');
      }
      const tenant_id = doc.tenant_id;
      if (doc.owner_sub !== actor_sub) {
        const check = await client.query<{ ok: boolean }>('SELECT is_tenant_manager($1::uuid) AS ok', [
          tenant_id,
        ]);
        if (!check.rows[0]?.ok) {
          throw new ForbiddenException('Only document owner or tenant manager can change access');
        }
      }
      const unique = [...new Set(user_subs.filter((u) => u !== doc.owner_sub))];
      if (unique.length) {
        const members = await db
          .select({ user_sub: memberships.user_sub })
          .from(memberships)
          .where(and(eq(memberships.tenant_id, tenant_id), inArray(memberships.user_sub, unique)));
        if (members.length !== unique.length) {
          throw new BadRequestException('All grants must target members of this tenant');
        }
      }
      await db.delete(document_grants).where(eq(document_grants.document_id, document_id));
      for (const target_sub of unique) {
        await db.insert(document_grants).values({
          document_id,
          tenant_id,
          user_sub: target_sub,
          created_by_sub: actor_sub,
        });
      }
      await db.insert(audit_events).values({
        tenant_id,
        actor_sub,
        action: 'document.access_replaced',
        target_type: 'document',
        target_id: document_id,
      });
      return { document_id, granted_users: unique.length };
    });
  }

  async deleteDocument(actor_sub: string, document_id: string): Promise<{ deleted: boolean }> {
    return withActor(actor_sub, async (db, client) => {
      const [d] = await db
        .select({
          tenant_id: documents.tenant_id,
          owner_sub: documents.owner_sub,
          file_path: documents.file_path,
        })
        .from(documents)
        .where(and(eq(documents.id, document_id), isNull(documents.deleted_at)))
        .for('update');
      if (!d) {
        throw new NotFoundException('Document not available');
      }
      if (d.owner_sub !== actor_sub) {
        const check = await client.query<{ ok: boolean }>('SELECT is_tenant_manager($1::uuid) AS ok', [
          d.tenant_id,
        ]);
        if (!check.rows[0]?.ok) {
          throw new ForbiddenException('Only document owner or tenant manager can delete document');
        }
      }
      if (d.file_path) {
        await db
          .insert(storage_deletions)
          .values({ document_id, object_key: d.file_path })
          .onConflictDoNothing();
      }
      await db.delete(document_chunks).where(eq(document_chunks.document_id, document_id));
      await db
        .update(documents)
        .set({ deleted_at: new Date(), body: '' })
        .where(eq(documents.id, document_id));
      await db.insert(audit_events).values({
        tenant_id: d.tenant_id,
        actor_sub,
        action: 'document.deleted',
        target_type: 'document',
        target_id: document_id,
      });
      return { deleted: true };
    });
  }

  getIngestionJob(actor_sub: string, job_id: string): Promise<IngestionJobResponseDto> {
    return this.jobs(actor_sub, job_id);
  }

  async jobs(actor_sub: string, job_id: string): Promise<IngestionJobResponseDto> {
    return withActor(actor_sub, async (db) => {
      const [job] = await db
        .select({
          id: ingestion_jobs.id,
          status: ingestion_jobs.status,
          stage: ingestion_jobs.stage,
          attempts: ingestion_jobs.attempts,
          created_at: ingestion_jobs.created_at,
          updated_at: ingestion_jobs.updated_at,
          completed_at: ingestion_jobs.completed_at,
          error_message: ingestion_jobs.error_message,
        })
        .from(ingestion_jobs)
        .where(eq(ingestion_jobs.document_id, job_id));
      if (!job) {
        throw new NotFoundException('Job unavailable');
      }
      return job;
    });
  }

  retryIngestionJob(actor_sub: string, document_id: string): Promise<{ id: string; status: string }> {
    return this.retryJob(actor_sub, document_id);
  }

  async retryJob(actor_sub: string, document_id: string): Promise<{ id: string; status: string }> {
    return withActor(actor_sub, async (db) => {
      const [doc] = await db
        .select({ tenant_id: documents.tenant_id })
        .from(documents)
        .where(and(eq(documents.id, document_id), isNull(documents.deleted_at)));
      if (!doc) {
        throw new NotFoundException('Document not available');
      }
      const [result] = await db
        .update(ingestion_jobs)
        .set({
          status: 'pending',
          attempts: 0,
          stage: 'queued',
          error_message: null,
          lease_token: null,
          lease_expires_at: null,
          next_attempt_at: new Date(),
          updated_at: new Date(),
        })
        .where(and(eq(ingestion_jobs.document_id, document_id), eq(ingestion_jobs.status, 'failed')))
        .returning({ id: ingestion_jobs.id });
      if (!result) {
        throw new BadRequestException('Job not found or not failed');
      }
      await db.update(documents).set({ status: 'queued' }).where(eq(documents.id, document_id));
      await db.insert(outbox_events).values({
        tenant_id: doc.tenant_id,
        topic: 'document.ingestion.requested',
        aggregate_id: document_id,
        payload: { document_id, job_id: result.id, retry: true },
      });
      return { id: result.id, status: 'pending' };
    });
  }

  getUsageSummary(actor_sub: string, tenant_id: string): Promise<UsageSummaryItemResponseDto[]> {
    return this.usage(actor_sub, tenant_id);
  }

  async usage(actor_sub: string, tenant_id: string): Promise<UsageSummaryItemResponseDto[]> {
    return withActor(actor_sub, async (db) => {
      const [can] = await db
        .select({ role: memberships.role })
        .from(memberships)
        .where(
          and(
            eq(memberships.tenant_id, tenant_id),
            eq(memberships.user_sub, actor_sub),
            inArray(memberships.role, ['owner', 'admin']),
          ),
        );
      if (!can) {
        throw new ForbiddenException('Manager role required');
      }
      const result = await db
        .select({
          category: usage_events.category,
          requests: sql<number>`count(*)::int`,
          input_tokens: sql<string>`coalesce(sum(${usage_events.input_tokens}), 0)::text`,
          output_tokens: sql<string>`coalesce(sum(${usage_events.output_tokens}), 0)::text`,
          cost_usd: sql<string>`coalesce(sum(${usage_events.cost_usd}), 0)::text`,
          average_latency_ms: sql<number>`coalesce(round(avg(${usage_events.latency_ms})), 0)::int`,
        })
        .from(usage_events)
        .where(
          and(
            eq(usage_events.tenant_id, tenant_id),
            sql`${usage_events.created_at} >= now() - interval '30 days'`,
          ),
        )
        .groupBy(usage_events.category)
        .orderBy(usage_events.category);
      return result.map((r) => ({
        category: r.category,
        requests: r.requests,
        input_tokens: Number(r.input_tokens) || 0,
        output_tokens: Number(r.output_tokens) || 0,
        cost_usd: Number(r.cost_usd) || 0,
        average_latency_ms: r.average_latency_ms,
      }));
    });
  }

  getTenantBudget(actor_sub: string, tenant_id: string): Promise<TenantBudgetResponseDto> {
    return this.budget(actor_sub, tenant_id);
  }

  async budget(actor_sub: string, tenant_id: string): Promise<TenantBudgetResponseDto> {
    return withActor(actor_sub, async (db) => {
      const [m] = await db
        .select({ user_sub: memberships.user_sub })
        .from(memberships)
        .where(and(eq(memberships.tenant_id, tenant_id), eq(memberships.user_sub, actor_sub)));
      if (!m) {
        throw new NotFoundException('Tenant not found');
      }
      const [r] = await db
        .select({
          tenant_id: tenant_budgets.tenant_id,
          daily_answer_limit: tenant_budgets.daily_answer_limit,
          daily_cost_limit_usd: tenant_budgets.daily_cost_limit_usd,
          updated_at: tenant_budgets.updated_at,
        })
        .from(tenant_budgets)
        .where(eq(tenant_budgets.tenant_id, tenant_id));
      if (!r) {
        return { tenant_id, daily_answer_limit: 100, daily_cost_limit_usd: 1000 };
      }
      return {
        tenant_id: r.tenant_id,
        daily_answer_limit: r.daily_answer_limit,
        daily_cost_limit_usd: Number(r.daily_cost_limit_usd),
        updated_at: r.updated_at,
      };
    });
  }

  updateTenantBudget(
    actor_sub: string,
    tenant_id: string,
    limit: number,
    cost_limit?: number,
  ): Promise<TenantBudgetResponseDto> {
    return this.updateBudget(actor_sub, tenant_id, limit, cost_limit);
  }

  async updateBudget(
    actor_sub: string,
    tenant_id: string,
    limit: number,
    cost_limit?: number,
  ): Promise<TenantBudgetResponseDto> {
    return withActor(actor_sub, async (db) => {
      const [can] = await db
        .select({ role: memberships.role })
        .from(memberships)
        .where(
          and(
            eq(memberships.tenant_id, tenant_id),
            eq(memberships.user_sub, actor_sub),
            inArray(memberships.role, ['owner', 'admin']),
          ),
        );
      if (!can) {
        throw new ForbiddenException('Manager role required');
      }
      const [r] = await db
        .insert(tenant_budgets)
        .values({
          tenant_id,
          daily_answer_limit: limit,
          daily_cost_limit_usd: cost_limit !== undefined ? String(cost_limit) : '1000',
        })
        .onConflictDoUpdate({
          target: tenant_budgets.tenant_id,
          set: {
            daily_answer_limit: limit,
            daily_cost_limit_usd:
              cost_limit !== undefined ? String(cost_limit) : tenant_budgets.daily_cost_limit_usd,
            updated_at: new Date(),
          },
        })
        .returning({
          tenant_id: tenant_budgets.tenant_id,
          daily_answer_limit: tenant_budgets.daily_answer_limit,
          daily_cost_limit_usd: tenant_budgets.daily_cost_limit_usd,
          updated_at: tenant_budgets.updated_at,
        });
      await db.insert(audit_events).values({
        tenant_id,
        actor_sub,
        action: 'budget.updated',
        target_type: 'tenant',
        target_id: tenant_id,
      });
      return {
        tenant_id: r.tenant_id,
        daily_answer_limit: r.daily_answer_limit,
        daily_cost_limit_usd: Number(r.daily_cost_limit_usd),
        updated_at: r.updated_at,
      };
    });
  }

  listAuditEvents(
    actor_sub: string,
    tenant_id: string,
    pagination: PaginationWindow = { limit: 25, offset: 0 },
  ): Promise<CountedRows<AuditEventItemResponseDto>> {
    return this.audit(actor_sub, tenant_id, pagination);
  }

  async audit(
    actor_sub: string,
    tenant_id: string,
    pagination: PaginationWindow = { limit: 25, offset: 0 },
  ): Promise<CountedRows<AuditEventItemResponseDto>> {
    return withActor(actor_sub, async (db) => {
      const [can] = await db
        .select({ role: memberships.role })
        .from(memberships)
        .where(
          and(
            eq(memberships.tenant_id, tenant_id),
            eq(memberships.user_sub, actor_sub),
            inArray(memberships.role, ['owner', 'admin']),
          ),
        );
      if (!can) {
        throw new ForbiddenException('Manager role required');
      }
      const [{ count }] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(audit_events)
        .where(eq(audit_events.tenant_id, tenant_id));
      const results = await db
        .select({
          id: audit_events.id,
          action: audit_events.action,
          target_type: audit_events.target_type,
          target_id: audit_events.target_id,
          actor_sub: audit_events.actor_sub,
          created_at: audit_events.created_at,
        })
        .from(audit_events)
        .where(eq(audit_events.tenant_id, tenant_id))
        .orderBy(desc(audit_events.created_at), asc(audit_events.id))
        .limit(pagination.limit)
        .offset(pagination.offset);
      return { count: count ?? 0, results };
    });
  }

  async addMember(
    actor_sub: string,
    tenant_id: string,
    email: string,
    role: Exclude<TenantRoleSchema, 'owner'>,
  ): Promise<Pick<TenantMemberSchema, 'user_sub' | 'role'>> {
    return withActor(actor_sub, async (db, client) => {
      const [can] = await db
        .select({ role: memberships.role })
        .from(memberships)
        .where(
          and(
            eq(memberships.tenant_id, tenant_id),
            eq(memberships.user_sub, actor_sub),
            inArray(memberships.role, ['owner', 'admin']),
          ),
        );
      if (!can) {
        throw new ForbiddenException('Manager required');
      }
      const user = await client.query<{ user_sub: string }>(
        'SELECT user_sub FROM find_existing_user_for_tenant($1, $2)',
        [tenant_id, email],
      );
      if (user.rows.length !== 1) {
        throw new NotFoundException('User must have signed in to the platform first');
      }
      const target_sub = user.rows[0].user_sub;
      const [inserted] = await db
        .insert(memberships)
        .values({ tenant_id, user_sub: target_sub, role })
        .onConflictDoNothing()
        .returning({ user_sub: memberships.user_sub, role: memberships.role });
      if (!inserted) {
        throw new BadRequestException('User already a member');
      }
      await db.insert(audit_events).values({
        tenant_id,
        actor_sub,
        action: 'membership.added',
        target_type: 'member',
        target_id: target_sub,
      });
      return { user_sub: inserted.user_sub, role: inserted.role };
    });
  }

  listAccessGroups(
    actor_sub: string,
    tenant_id: string,
    pagination: PaginationWindow = { limit: 25, offset: 0 },
  ): Promise<CountedRows<{ id: string; name: string; member_count: number }>> {
    return this.groups(actor_sub, tenant_id, pagination);
  }

  async groups(
    actor_sub: string,
    tenant_id: string,
    pagination: PaginationWindow = { limit: 25, offset: 0 },
  ): Promise<CountedRows<{ id: string; name: string; member_count: number }>> {
    return withActor(actor_sub, async (db) => {
      const [m] = await db
        .select({ user_sub: memberships.user_sub })
        .from(memberships)
        .where(and(eq(memberships.tenant_id, tenant_id), eq(memberships.user_sub, actor_sub)));
      if (!m) {
        throw new NotFoundException('Tenant not found');
      }
      const [{ count }] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(access_groups)
        .where(eq(access_groups.tenant_id, tenant_id));
      const results = await db
        .select({
          id: access_groups.id,
          name: access_groups.name,
          member_count: sql<number>`(SELECT count(*)::int FROM access_group_memberships m WHERE m.group_id = ${access_groups.id})`,
        })
        .from(access_groups)
        .where(eq(access_groups.tenant_id, tenant_id))
        .orderBy(asc(access_groups.name), asc(access_groups.id))
        .limit(pagination.limit)
        .offset(pagination.offset);
      return { count: count ?? 0, results };
    });
  }

  createAccessGroup(
    actor_sub: string,
    tenant_id: string,
    name: string,
  ): Promise<{ id: string; tenant_id: string; name: string }> {
    return this.createGroup(actor_sub, tenant_id, name);
  }

  async createGroup(
    actor_sub: string,
    tenant_id: string,
    name: string,
  ): Promise<{ id: string; tenant_id: string; name: string }> {
    return withActor(actor_sub, async (db) => {
      const [can] = await db
        .select({ role: memberships.role })
        .from(memberships)
        .where(
          and(
            eq(memberships.tenant_id, tenant_id),
            eq(memberships.user_sub, actor_sub),
            inArray(memberships.role, ['owner', 'admin']),
          ),
        );
      if (!can) {
        throw new ForbiddenException('Manager required');
      }
      const [row] = await db
        .insert(access_groups)
        .values({ tenant_id, name })
        .returning({ id: access_groups.id, tenant_id: access_groups.tenant_id, name: access_groups.name });
      await db.insert(audit_events).values({
        tenant_id,
        actor_sub,
        action: 'group.created',
        target_type: 'group',
        target_id: row.id,
      });
      return row;
    });
  }

  deleteAccessGroup(actor_sub: string, group_id: string): Promise<{ removed: boolean }> {
    return this.deleteGroup(actor_sub, group_id);
  }

  async deleteGroup(actor_sub: string, group_id: string): Promise<{ removed: boolean }> {
    return withActor(actor_sub, async (db) => {
      const [g] = await db
        .select({ tenant_id: access_groups.tenant_id })
        .from(access_groups)
        .where(eq(access_groups.id, group_id))
        .for('update');
      if (!g) {
        throw new NotFoundException('Group not found');
      }
      const tenant_id = g.tenant_id;
      const [can] = await db
        .select({ role: memberships.role })
        .from(memberships)
        .where(
          and(
            eq(memberships.tenant_id, tenant_id),
            eq(memberships.user_sub, actor_sub),
            inArray(memberships.role, ['owner', 'admin']),
          ),
        );
      if (!can) {
        throw new ForbiddenException('Manager required');
      }
      await db.delete(access_groups).where(eq(access_groups.id, group_id));
      await db.insert(audit_events).values({
        tenant_id,
        actor_sub,
        action: 'group.deleted',
        target_type: 'group',
        target_id: group_id,
      });
      return { removed: true };
    });
  }

  listGroupMembers(
    actor_sub: string,
    group_id: string,
    pagination: PaginationWindow = { limit: 25, offset: 0 },
  ): Promise<CountedRows<{ user_sub: string; email: string | null }>> {
    return this.groupMembers(actor_sub, group_id, pagination);
  }

  async groupMembers(
    actor_sub: string,
    group_id: string,
    pagination: PaginationWindow = { limit: 25, offset: 0 },
  ): Promise<CountedRows<{ user_sub: string; email: string | null }>> {
    return withActor(actor_sub, async (db, client) => {
      const [g] = await db
        .select({ id: access_groups.id })
        .from(access_groups)
        .where(eq(access_groups.id, group_id));
      if (!g) {
        throw new NotFoundException('Group not found');
      }
      const all = await client.query<{ user_sub: string; email: string | null }>(
        'SELECT user_sub, email FROM list_group_members_for_actor($1::uuid)',
        [group_id],
      );
      const count = all.rows.length;
      const results = all.rows.slice(pagination.offset, pagination.offset + pagination.limit);
      return { count, results };
    });
  }

  async addGroupMember(actor_sub: string, group_id: string, user_sub: string): Promise<{ user_sub: string }> {
    return withActor(actor_sub, async (db) => {
      const [g] = await db
        .select({ tenant_id: access_groups.tenant_id })
        .from(access_groups)
        .where(eq(access_groups.id, group_id));
      if (!g) {
        throw new NotFoundException('Group not found');
      }
      const tenant_id = g.tenant_id;
      const [can] = await db
        .select({ role: memberships.role })
        .from(memberships)
        .where(
          and(
            eq(memberships.tenant_id, tenant_id),
            eq(memberships.user_sub, actor_sub),
            inArray(memberships.role, ['owner', 'admin']),
          ),
        );
      if (!can) {
        throw new ForbiddenException('Manager required');
      }
      const [isTenantMember] = await db
        .select({ user_sub: memberships.user_sub })
        .from(memberships)
        .where(and(eq(memberships.tenant_id, tenant_id), eq(memberships.user_sub, user_sub)));
      if (!isTenantMember) {
        throw new BadRequestException('Target user must belong to the group tenant');
      }
      const [row] = await db
        .insert(access_group_memberships)
        .values({ group_id, tenant_id, user_sub })
        .onConflictDoNothing()
        .returning({ user_sub: access_group_memberships.user_sub });
      if (!row) {
        throw new BadRequestException('User already belongs to this group');
      }
      await db.insert(audit_events).values({
        tenant_id,
        actor_sub,
        action: 'group.member_added',
        target_type: 'group',
        target_id: group_id,
      });
      return row;
    });
  }

  async removeGroupMember(
    actor_sub: string,
    group_id: string,
    user_sub: string,
  ): Promise<{ removed: boolean }> {
    return withActor(actor_sub, async (db) => {
      const [g] = await db
        .select({ tenant_id: access_groups.tenant_id })
        .from(access_groups)
        .where(eq(access_groups.id, group_id));
      if (!g) {
        throw new NotFoundException('Group not found');
      }
      const tenant_id = g.tenant_id;
      const [can] = await db
        .select({ role: memberships.role })
        .from(memberships)
        .where(
          and(
            eq(memberships.tenant_id, tenant_id),
            eq(memberships.user_sub, actor_sub),
            inArray(memberships.role, ['owner', 'admin']),
          ),
        );
      if (!can) {
        throw new ForbiddenException('Manager required');
      }
      const [deleted] = await db
        .delete(access_group_memberships)
        .where(
          and(
            eq(access_group_memberships.group_id, group_id),
            eq(access_group_memberships.user_sub, user_sub),
          ),
        )
        .returning({ user_sub: access_group_memberships.user_sub });
      if (!deleted) {
        throw new NotFoundException('Group member not found');
      }
      await db.insert(audit_events).values({
        tenant_id,
        actor_sub,
        action: 'group.member_removed',
        target_type: 'group',
        target_id: group_id,
      });
      return { removed: true };
    });
  }

  listDocumentGroupGrants(actor_sub: string, document_id: string): Promise<Array<{ group_id: string }>> {
    return this.groupGrants(actor_sub, document_id);
  }

  async groupGrants(actor_sub: string, document_id: string): Promise<Array<{ group_id: string }>> {
    return withActor(actor_sub, async (db, client) => {
      const [d] = await db
        .select({ tenant_id: documents.tenant_id, owner_sub: documents.owner_sub })
        .from(documents)
        .where(and(eq(documents.id, document_id), isNull(documents.deleted_at)));
      if (!d) {
        throw new NotFoundException('Document not available');
      }
      if (d.owner_sub !== actor_sub) {
        const check = await client.query<{ ok: boolean }>('SELECT is_tenant_manager($1::uuid) AS ok', [
          d.tenant_id,
        ]);
        if (!check.rows[0]?.ok) {
          throw new ForbiddenException('Owner or manager required');
        }
      }
      return db
        .select({ group_id: document_group_grants.group_id })
        .from(document_group_grants)
        .where(eq(document_group_grants.document_id, document_id));
    });
  }

  replaceDocumentGroupGrants(
    actor_sub: string,
    document_id: string,
    group_ids: string[],
  ): Promise<{ document_id: string; group_count: number }> {
    return this.replaceGroupGrants(actor_sub, document_id, group_ids);
  }

  async replaceGroupGrants(
    actor_sub: string,
    document_id: string,
    group_ids: string[],
  ): Promise<{ document_id: string; group_count: number }> {
    return withActor(actor_sub, async (db, client) => {
      const [row] = await db
        .select({ tenant_id: documents.tenant_id, owner_sub: documents.owner_sub })
        .from(documents)
        .where(and(eq(documents.id, document_id), isNull(documents.deleted_at)))
        .for('update');
      if (!row) {
        throw new NotFoundException('Document not available');
      }
      const tenant_id = row.tenant_id;
      if (row.owner_sub !== actor_sub) {
        const check = await client.query<{ ok: boolean }>('SELECT is_tenant_manager($1::uuid) AS ok', [
          tenant_id,
        ]);
        if (!check.rows[0]?.ok) {
          throw new ForbiddenException('Owner or manager required');
        }
      }
      const unique = [...new Set(group_ids)];
      if (unique.length) {
        const existing = await db
          .select({ id: access_groups.id })
          .from(access_groups)
          .where(and(inArray(access_groups.id, unique), eq(access_groups.tenant_id, tenant_id)));
        if (existing.length !== unique.length) {
          throw new BadRequestException('Groups must belong to document tenant');
        }
      }
      await db.delete(document_group_grants).where(eq(document_group_grants.document_id, document_id));
      for (const group of unique) {
        await db.insert(document_group_grants).values({
          document_id,
          group_id: group,
          tenant_id,
          created_by_sub: actor_sub,
        });
      }
      await db.insert(audit_events).values({
        tenant_id,
        actor_sub,
        action: 'document.group_access_replaced',
        target_type: 'document',
        target_id: document_id,
      });
      return { document_id, group_count: unique.length };
    });
  }

  async listDlq(
    actor_sub: string,
    tenant_id: string,
    pagination: PaginationWindow = { limit: 25, offset: 0 },
  ): Promise<CountedRows<DlqItemResponseDto>> {
    return withActor(actor_sub, async (db, client) => {
      const [can] = await db
        .select({ role: memberships.role })
        .from(memberships)
        .where(
          and(
            eq(memberships.tenant_id, tenant_id),
            eq(memberships.user_sub, actor_sub),
            inArray(memberships.role, ['owner', 'admin']),
          ),
        );
      if (!can) {
        throw new ForbiddenException('Manager role required');
      }
      const total = await client.query<{ count: number }>(
        `SELECT (
           (SELECT count(*)::int FROM ingestion_jobs j JOIN documents d ON d.id = j.document_id
            WHERE d.tenant_id = $1 AND d.deleted_at IS NULL AND j.status = 'failed')
           +
           (SELECT count(*)::int FROM outbox_events o
            WHERE o.tenant_id = $1 AND o.status = 'failed')
         )::int AS count`,
        [tenant_id],
      );
      const rows = await client.query<DlqItemResponseDto>(
        `SELECT * FROM (
           SELECT j.id,
                  'ingestion_job'::text AS source,
                  d.id::text AS target_id,
                  d.title,
                  j.attempts,
                  j.error_message,
                  j.updated_at
           FROM ingestion_jobs j
           JOIN documents d ON d.id = j.document_id
           WHERE d.tenant_id = $1 AND d.deleted_at IS NULL AND j.status = 'failed'
           UNION ALL
           SELECT o.id,
                  'outbox_event'::text AS source,
                  o.aggregate_id::text AS target_id,
                  o.topic AS title,
                  o.attempts,
                  o.last_error AS error_message,
                  o.created_at AS updated_at
           FROM outbox_events o
           WHERE o.tenant_id = $1 AND o.status = 'failed'
         ) dlq
         ORDER BY updated_at DESC, id ASC
         LIMIT $2 OFFSET $3`,
        [tenant_id, pagination.limit, pagination.offset],
      );
      return { count: total.rows[0]?.count ?? 0, results: rows.rows };
    });
  }

  async replayDlq(
    actor_sub: string,
    dlq_id: string,
    source: DlqSourceSchema,
  ): Promise<{ id: string; source: DlqSourceSchema; status: string }> {
    return withActor(actor_sub, async (db) => {
      if (source === 'ingestion_job') {
        const [job] = await db
          .select({
            id: ingestion_jobs.id,
            document_id: ingestion_jobs.document_id,
            tenant_id: documents.tenant_id,
          })
          .from(ingestion_jobs)
          .innerJoin(documents, eq(documents.id, ingestion_jobs.document_id))
          .where(
            and(
              eq(ingestion_jobs.id, dlq_id),
              isNull(documents.deleted_at),
              eq(ingestion_jobs.status, 'failed'),
            ),
          )
          .for('update');
        if (!job) {
          throw new NotFoundException('Failed ingestion job not found');
        }
        const { document_id, tenant_id } = job;
        const [can] = await db
          .select({ role: memberships.role })
          .from(memberships)
          .where(
            and(
              eq(memberships.tenant_id, tenant_id),
              eq(memberships.user_sub, actor_sub),
              inArray(memberships.role, ['owner', 'admin']),
            ),
          );
        if (!can) {
          throw new ForbiddenException('Manager role required');
        }
        await db
          .update(ingestion_jobs)
          .set({
            status: 'pending',
            stage: 'queued',
            attempts: 0,
            error_message: null,
            lease_token: null,
            lease_expires_at: null,
            next_attempt_at: new Date(),
            updated_at: new Date(),
          })
          .where(eq(ingestion_jobs.id, dlq_id));
        await db.update(documents).set({ status: 'queued' }).where(eq(documents.id, document_id));
        await db.insert(outbox_events).values({
          tenant_id,
          topic: 'document.ingestion.requested',
          aggregate_id: document_id,
          payload: { document_id, job_id: dlq_id, dlq_replay: true },
        });
        await db.insert(audit_events).values({
          tenant_id,
          actor_sub,
          action: 'dlq.replayed',
          target_type: 'ingestion_job',
          target_id: dlq_id,
        });
        return { id: dlq_id, source, status: 'pending' };
      }

      const [evt] = await db
        .select({ id: outbox_events.id, tenant_id: outbox_events.tenant_id })
        .from(outbox_events)
        .where(and(eq(outbox_events.id, dlq_id), eq(outbox_events.status, 'failed')))
        .for('update');
      if (!evt) {
        throw new NotFoundException('Failed outbox event not found');
      }
      const tenant_id = evt.tenant_id;
      const [can] = await db
        .select({ role: memberships.role })
        .from(memberships)
        .where(
          and(
            eq(memberships.tenant_id, tenant_id),
            eq(memberships.user_sub, actor_sub),
            inArray(memberships.role, ['owner', 'admin']),
          ),
        );
      if (!can) {
        throw new ForbiddenException('Manager role required');
      }
      await db
        .update(outbox_events)
        .set({
          status: 'pending',
          attempts: 0,
          last_error: null,
          lease_expires_at: null,
          next_attempt_at: new Date(),
        })
        .where(eq(outbox_events.id, dlq_id));
      await db.insert(audit_events).values({
        tenant_id,
        actor_sub,
        action: 'dlq.replayed',
        target_type: 'outbox_event',
        target_id: dlq_id,
      });
      return { id: dlq_id, source, status: 'pending' };
    });
  }
}

export const PgGovernanceRepository = PostgresGovernanceRepository;
