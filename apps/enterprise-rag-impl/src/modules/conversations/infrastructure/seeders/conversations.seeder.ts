import { sql } from 'drizzle-orm';
import { answer_citations, answer_evidence, conversations, messages } from '../../../../database/schema';
import type { SeedExecutionContext } from '../../../../shared/infrastructure/database/seeders/seed-types';

export class ConversationsSeeder {
  constructor(private readonly ctx: SeedExecutionContext) {}

  async run(): Promise<void> {
    const { actors, ids } = this.ctx;
    const tenant_id = ids.tenant_id ?? ids.tenantId;

    await this.ctx.withActorDb(actors.owner.sub, async (db) => {
      await db
        .insert(conversations)
        .values({
          id: ids.conversationId,
          knowledge_base_id: ids.securityKbId,
          tenant_id,
          created_by_sub: actors.owner.sub,
          title: 'Auditoría de Controles RLS y Validez de Citas OIDC',
        })
        .onConflictDoUpdate({
          target: conversations.id,
          set: { title: 'Auditoría de Controles RLS y Validez de Citas OIDC' },
        });

      const userTurnTime = new Date('2026-11-01T14:00:00.000Z');
      const assistantTurnTime = new Date('2026-11-01T14:00:04.000Z');

      await db
        .insert(messages)
        .values([
          {
            id: ids.userMessageId,
            conversation_id: ids.conversationId,
            role: 'user',
            content:
              '¿Cómo garantiza la plataforma el aislamiento Zero Trust entre organizaciones y la revocación automática de citas?',
            abstained: false,
            created_at: userTurnTime,
          },
          {
            id: ids.assistantMessageId,
            conversation_id: ids.conversationId,
            role: 'assistant',
            content:
              'La plataforma aplica aislamiento obligatorio mediante FORCE ROW LEVEL SECURITY en PostgreSQL 17 evaluando app.actor_sub a partir del JWT OIDC con PKCE S256 emitido por Keycloak 26 [1]. Además, cada respuesta persiste la evidencia suministrada en answer_evidence y verifica answer_has_revoked_evidence al consultar el historial, ocultando en modo fail-closed cualquier cita cuyo documento cambie de versión o revoque permisos [2].',
            abstained: false,
            created_at: assistantTurnTime,
          },
        ])
        .onConflictDoUpdate({
          target: messages.id,
          set: {
            content: sql`excluded.content`,
            abstained: sql`excluded.abstained`,
          },
        });

      await db
        .insert(answer_evidence)
        .values([
          {
            message_id: ids.assistantMessageId,
            document_id: ids.zeroTrustDocId,
            chunk_id: ids.zeroTrustChunk1Id,
            document_version: 1,
          },
          {
            message_id: ids.assistantMessageId,
            document_id: ids.zeroTrustDocId,
            chunk_id: ids.zeroTrustChunk2Id,
            document_version: 1,
          },
        ])
        .onConflictDoNothing({
          target: [answer_evidence.message_id, answer_evidence.chunk_id],
        });

      await db
        .insert(answer_citations)
        .values([
          {
            id: ids.citation1Id,
            message_id: ids.assistantMessageId,
            document_id: ids.zeroTrustDocId,
            chunk_id: ids.zeroTrustChunk1Id,
            document_version: 1,
            reference_index: 1,
          },
          {
            id: ids.citation2Id,
            message_id: ids.assistantMessageId,
            document_id: ids.zeroTrustDocId,
            chunk_id: ids.zeroTrustChunk2Id,
            document_version: 1,
            reference_index: 2,
          },
        ])
        .onConflictDoNothing({
          target: [answer_citations.message_id, answer_citations.reference_index],
        });
    });
  }
}

export async function seedConversations(ctx: SeedExecutionContext): Promise<void> {
  await new ConversationsSeeder(ctx).run();
}
