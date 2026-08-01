import { sql } from 'drizzle-orm';
import {
  access_group_memberships,
  access_groups,
  audit_events,
  document_grants,
  document_group_grants,
  memberships,
  tenant_budgets,
  usage_events,
} from '../../../../database/schema';
import type { SeedExecutionContext } from '../../../../shared/infrastructure/database/seeders/seed-types';

export class GovernanceSeeder {
  constructor(private readonly ctx: SeedExecutionContext) {}

  async run(): Promise<void> {
    const { actors, ids } = this.ctx;
    const tenant_id = ids.tenant_id ?? ids.tenantId;

    await this.ctx.withActorDb(actors.owner.sub, async (db) => {
      // 1. Provision Admin and Viewer memberships inside the demo tenant.
      await db
        .insert(memberships)
        .values([
          {
            tenant_id,
            user_sub: actors.admin.sub,
            role: 'admin',
          },
          {
            tenant_id,
            user_sub: actors.viewer.sub,
            role: 'viewer',
          },
        ])
        .onConflictDoUpdate({
          target: [memberships.tenant_id, memberships.user_sub],
          set: { role: sql`excluded.role` },
        });

      // 2. Provision Zero-Trust access groups (`CSIRT` & `Auditoría Interna`).
      await db
        .insert(access_groups)
        .values([
          {
            id: ids.csirtGroupId,
            tenant_id,
            name: 'Comité de Seguridad CSIRT',
          },
          {
            id: ids.auditGroupId,
            tenant_id,
            name: 'Auditoría Interna y Cumplimiento',
          },
        ])
        .onConflictDoUpdate({
          target: access_groups.id,
          set: { name: sql`excluded.name` },
        });

      await db
        .insert(access_group_memberships)
        .values([
          {
            group_id: ids.csirtGroupId,
            tenant_id,
            user_sub: actors.owner.sub,
          },
          {
            group_id: ids.csirtGroupId,
            tenant_id,
            user_sub: actors.admin.sub,
          },
          {
            group_id: ids.auditGroupId,
            tenant_id,
            user_sub: actors.viewer.sub,
          },
        ])
        .onConflictDoNothing({
          target: [access_group_memberships.group_id, access_group_memberships.user_sub],
        });

      // 3. Grant explicit ACLs on the private CSIRT runbook (direct + group grant; viewer remains unauthorized).
      await db
        .insert(document_grants)
        .values({
          document_id: ids.incidentRunbookDocId,
          tenant_id,
          user_sub: actors.admin.sub,
          permission: 'read',
          created_by_sub: actors.owner.sub,
        })
        .onConflictDoNothing({
          target: [document_grants.document_id, document_grants.user_sub],
        });

      await db
        .insert(document_group_grants)
        .values({
          document_id: ids.incidentRunbookDocId,
          group_id: ids.csirtGroupId,
          tenant_id,
          created_by_sub: actors.owner.sub,
        })
        .onConflictDoNothing({
          target: [document_group_grants.document_id, document_group_grants.group_id],
        });

      // 4. Configure tenant-wide FinOps daily budget & historical usage telemetry.
      await db
        .insert(tenant_budgets)
        .values({
          tenant_id,
          daily_answer_limit: 250,
          daily_cost_limit_usd: '150.00',
        })
        .onConflictDoUpdate({
          target: tenant_budgets.tenant_id,
          set: {
            daily_answer_limit: 250,
            daily_cost_limit_usd: '150.00',
            updated_at: new Date(),
          },
        });

      await db
        .insert(usage_events)
        .values([
          {
            id: ids.usageRetrievalId,
            tenant_id,
            actor_sub: actors.owner.sub,
            category: 'retrieval',
            model_name: this.ctx.embeddingModelName,
            input_tokens: 48,
            output_tokens: 0,
            latency_ms: 42,
            cost_usd: '0.00001200',
            reserved_cost_usd: '0',
          },
          {
            id: ids.usageAnswerId,
            tenant_id,
            actor_sub: actors.owner.sub,
            category: 'answer',
            model_name: 'qwen2.5:3b',
            input_tokens: 612,
            output_tokens: 184,
            latency_ms: 1280,
            cost_usd: '0.00142000',
            reserved_cost_usd: '0',
          },
          {
            id: ids.usageEvalId,
            tenant_id,
            actor_sub: actors.owner.sub,
            category: 'evaluation',
            model_name: this.ctx.embeddingModelName,
            input_tokens: 144,
            output_tokens: 0,
            latency_ms: 195,
            cost_usd: '0.00003600',
            reserved_cost_usd: '0',
          },
        ])
        .onConflictDoNothing({
          target: usage_events.id,
        });

      // 5. Append immutable-style governance audit trail records.
      await db
        .insert(audit_events)
        .values([
          {
            id: ids.auditSeededId,
            tenant_id,
            actor_sub: actors.owner.sub,
            action: 'tenant.seeded',
            target_type: 'tenant',
            target_id: tenant_id,
          },
          {
            id: ids.auditDocIngestedId,
            tenant_id,
            actor_sub: actors.owner.sub,
            action: 'document.ingested',
            target_type: 'document',
            target_id: ids.zeroTrustDocId,
          },
          {
            id: ids.auditGroupCreatedId,
            tenant_id,
            actor_sub: actors.owner.sub,
            action: 'group.created',
            target_type: 'access_group',
            target_id: ids.csirtGroupId,
          },
          {
            id: ids.auditBudgetUpdatedId,
            tenant_id,
            actor_sub: actors.owner.sub,
            action: 'budget.updated',
            target_type: 'tenant_budget',
            target_id: tenant_id,
          },
        ])
        .onConflictDoNothing({
          target: audit_events.id,
        });
    });
  }
}

export async function seedGovernance(ctx: SeedExecutionContext): Promise<void> {
  await new GovernanceSeeder(ctx).run();
}
