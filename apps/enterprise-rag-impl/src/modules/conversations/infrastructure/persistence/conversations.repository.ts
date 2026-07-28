import { Injectable, NotFoundException } from '@nestjs/common';
import { and, desc, eq, isNull, sql } from 'drizzle-orm';
import type { CountedRows, PaginationWindow } from '~/shared/types/pagination.type';
import { withActor } from '../../../../database/pool';
import {
  answer_citations,
  answer_evidence,
  audit_events,
  conversations,
  document_chunks,
  knowledge_bases,
  messages,
} from '../../../../database/schema';
import type { AnswerEvidence } from '../../../knowledge/application/services/answer.service';
import type { AnswerResultSchema } from '../../../knowledge/domain/schemas/answer-result.schema';
import type { ConversationsRepositoryPort } from '../../application/ports/conversations-repository.port';
import {
  CONVERSATION_CONCURRENCY_REVOKED_MESSAGE,
  CONVERSATION_REVOKED_MESSAGE,
} from '../../const/conversations.const';
import type { MessageRoleSchema } from '../../domain/schemas/conversation-message.schema';
import type {
  ConversationCitationResponseDto,
  ConversationDetailResponseDto,
  ConversationSummaryResponseDto,
  ConversationTurnResponseDto,
  ResolvedCitationResponseDto,
} from '../../presentation/http/dto/conversations.dto';

@Injectable()
export class PostgresConversationsRepository implements ConversationsRepositoryPort {
  async list(
    actor_sub: string,
    knowledge_base_id: string | undefined,
    pagination: PaginationWindow = { limit: 25, offset: 0 },
  ): Promise<CountedRows<ConversationSummaryResponseDto>> {
    return withActor(actor_sub, async (db) => {
      const whereCondition = knowledge_base_id
        ? and(isNull(conversations.deleted_at), eq(conversations.knowledge_base_id, knowledge_base_id))
        : isNull(conversations.deleted_at);

      const [{ count }] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(conversations)
        .where(whereCondition);

      const results = await db
        .select({
          id: conversations.id,
          knowledge_base_id: conversations.knowledge_base_id,
          tenant_id: conversations.tenant_id,
          title: conversations.title,
          created_at: conversations.created_at,
        })
        .from(conversations)
        .where(whereCondition)
        .orderBy(desc(conversations.created_at), desc(conversations.id))
        .limit(pagination.limit)
        .offset(pagination.offset);

      return { count, results };
    });
  }

  async create(
    actor_sub: string,
    knowledge_base_id: string,
    title: string,
  ): Promise<ConversationSummaryResponseDto> {
    return withActor(actor_sub, async (db) => {
      const [kbRow] = await db
        .select({ tenant_id: knowledge_bases.tenant_id })
        .from(knowledge_bases)
        .where(eq(knowledge_bases.id, knowledge_base_id));
      if (!kbRow) {
        throw new NotFoundException('Knowledge base not found');
      }
      const [createdConversation] = await db
        .insert(conversations)
        .values({
          knowledge_base_id,
          tenant_id: kbRow.tenant_id,
          created_by_sub: actor_sub,
          title,
        })
        .returning({
          id: conversations.id,
          knowledge_base_id: conversations.knowledge_base_id,
          tenant_id: conversations.tenant_id,
          title: conversations.title,
          created_at: conversations.created_at,
        });

      await db
        .insert(audit_events)
        .values({
          tenant_id: kbRow.tenant_id,
          actor_sub,
          action: 'conversation.created',
          target_type: 'conversation',
          target_id: createdConversation.id,
        })
        .catch(() => {});

      return createdConversation;
    });
  }

  async get(actor_sub: string, conversation_id: string): Promise<ConversationDetailResponseDto> {
    return withActor(actor_sub, async (db, client) => {
      const [conversationRecord] = await db
        .select({
          id: conversations.id,
          knowledge_base_id: conversations.knowledge_base_id,
          tenant_id: conversations.tenant_id,
          title: conversations.title,
          created_at: conversations.created_at,
        })
        .from(conversations)
        .where(and(eq(conversations.id, conversation_id), isNull(conversations.deleted_at)));
      if (!conversationRecord) {
        throw new NotFoundException('Conversation not found');
      }

      const msgResult = await client.query<{
        id: string;
        role: MessageRoleSchema;
        content: string;
        abstained: boolean;
        revoked: boolean;
        created_at: string;
      }>(
        `WITH msg_state AS (
           SELECT m.id,
                  m.role,
                  m.content AS raw_content,
                  m.abstained AS raw_abstained,
                  m.created_at,
                  CASE
                    WHEN m.role = 'assistant' THEN answer_has_revoked_evidence(m.id)
                    ELSE false
                  END AS revoked
           FROM messages m
           WHERE m.conversation_id = $1
         )
         SELECT id,
                role,
                CASE WHEN revoked THEN '${CONVERSATION_REVOKED_MESSAGE}' ELSE raw_content END AS content,
                (raw_abstained OR revoked) AS abstained,
                revoked,
                created_at
         FROM msg_state
         ORDER BY created_at ASC, id ASC`,
        [conversation_id],
      );

      const nonRevokedAssistantIds = msgResult.rows
        .filter((messageRow) => messageRow.role === 'assistant' && !messageRow.revoked)
        .map((messageRow) => messageRow.id);

      const citations = nonRevokedAssistantIds.length
        ? await client.query<{
            id: string;
            message_id: string;
            document_id: string;
            chunk_id: string;
            reference_index: number;
            document_version: number;
            title: string;
          }>(
            `SELECT c.id,
                    c.message_id,
                    c.document_id,
                    c.chunk_id,
                    c.reference_index,
                    c.document_version,
                    d.title
             FROM answer_citations c
             JOIN documents d ON d.id = c.document_id
             WHERE c.message_id = ANY($1::uuid[])
               AND d.deleted_at IS NULL
               AND d.version = c.document_version
               AND can_read_document(c.document_id)
             ORDER BY c.reference_index ASC`,
            [nonRevokedAssistantIds],
          )
        : { rows: [] };

      return {
        ...conversationRecord,
        messages: msgResult.rows.map(({ revoked: _ignored, ...messageRow }) => ({
          ...messageRow,
          citations: citations.rows.filter((citationRow) => citationRow.message_id === messageRow.id),
        })),
      };
    });
  }

  async getKnowledgeBaseForConversation(
    actor_sub: string,
    conversation_id: string,
  ): Promise<{ knowledge_base_id: string }> {
    return withActor(actor_sub, async (db) => {
      const [knowledgeBaseRecord] = await db
        .select({ knowledge_base_id: conversations.knowledge_base_id })
        .from(conversations)
        .where(and(eq(conversations.id, conversation_id), isNull(conversations.deleted_at)));
      if (!knowledgeBaseRecord) {
        throw new NotFoundException('Conversation unavailable');
      }
      return knowledgeBaseRecord;
    });
  }

  async persistTurn(
    actor_sub: string,
    conversation_id: string,
    question: string,
    result: AnswerResultSchema,
    evidence: AnswerEvidence[],
  ): Promise<ConversationTurnResponseDto> {
    return withActor(actor_sub, async (db, client) => {
      const [existingConversation] = await db
        .select({ id: conversations.id })
        .from(conversations)
        .where(and(eq(conversations.id, conversation_id), isNull(conversations.deleted_at)))
        .for('update');
      if (!existingConversation) {
        throw new NotFoundException('Conversation no longer accessible');
      }
      const [createdUserMessage] = await db
        .insert(messages)
        .values({
          conversation_id,
          role: 'user',
          content: question,
        })
        .returning({ id: messages.id });

      let currentResult = result;
      if (evidence.length > 0) {
        const chunkIds = evidence.map((evidenceItem) => evidenceItem.chunk_id);
        const docIds = evidence.map((evidenceItem) => evidenceItem.document_id);
        const versions = evidence.map((evidenceItem) => evidenceItem.document_version);
        const active = await client.query<{ matched: number }>(
          `WITH expected AS (
             SELECT * FROM unnest($1::uuid[], $2::uuid[], $3::int[]) AS t(chunk_id, document_id, doc_version)
           )
           SELECT count(*)::int AS matched
           FROM expected e
           JOIN document_chunks ch ON ch.id = e.chunk_id
             AND ch.document_id = e.document_id
             AND ch.document_version = e.doc_version
           JOIN documents d ON d.id = ch.document_id
             AND d.version = e.doc_version
             AND d.deleted_at IS NULL
           WHERE can_read_document(ch.document_id)`,
          [chunkIds, docIds, versions],
        );
        if ((active.rows[0]?.matched ?? 0) !== evidence.length) {
          currentResult = {
            answer: CONVERSATION_CONCURRENCY_REVOKED_MESSAGE,
            citations: [],
            abstained: true,
          };
        }
      }

      const [createdAssistantMessage] = await db
        .insert(messages)
        .values({
          conversation_id,
          role: 'assistant',
          content: currentResult.answer,
          abstained: currentResult.abstained,
        })
        .returning({ id: messages.id });

      if (!currentResult.abstained) {
        for (const evidenceItem of evidence) {
          await db
            .insert(answer_evidence)
            .values({
              message_id: createdAssistantMessage.id,
              document_id: evidenceItem.document_id,
              chunk_id: evidenceItem.chunk_id,
              document_version: evidenceItem.document_version,
            })
            .onConflictDoNothing();
        }
      }

      const citations: ConversationCitationResponseDto[] = [];
      for (const citationItem of currentResult.citations) {
        const [allowed] = await db
          .select({ id: document_chunks.id })
          .from(document_chunks)
          .where(
            and(
              eq(document_chunks.id, citationItem.chunk_id),
              eq(document_chunks.document_id, citationItem.document_id),
              eq(document_chunks.document_version, citationItem.document_version),
            ),
          );
        if (!allowed) {
          continue;
        }
        const [inserted] = await db
          .insert(answer_citations)
          .values({
            message_id: createdAssistantMessage.id,
            document_id: citationItem.document_id,
            chunk_id: citationItem.chunk_id,
            document_version: citationItem.document_version,
            reference_index: citationItem.index,
          })
          .returning({ id: answer_citations.id });
        citations.push({
          ...citationItem,
          id: inserted.id,
          reference_index: citationItem.index,
        });
      }

      return {
        user_message_id: createdUserMessage.id,
        assistant_message_id: createdAssistantMessage.id,
        answer: currentResult.answer,
        abstained: currentResult.abstained,
        citations,
      };
    });
  }

  async deleteConversation(actor_sub: string, conversation_id: string): Promise<{ deleted: boolean }> {
    return withActor(actor_sub, async (db) => {
      const [updatedConversation] = await db
        .update(conversations)
        .set({ deleted_at: new Date() })
        .where(
          and(
            eq(conversations.id, conversation_id),
            eq(conversations.created_by_sub, actor_sub),
            isNull(conversations.deleted_at),
          ),
        )
        .returning({ tenant_id: conversations.tenant_id });
      if (!updatedConversation) {
        throw new NotFoundException('Conversation unavailable');
      }
      await db
        .insert(audit_events)
        .values({
          tenant_id: updatedConversation.tenant_id,
          actor_sub,
          action: 'conversation.deleted',
          target_type: 'conversation',
          target_id: conversation_id,
        })
        .catch(() => {});
      return { deleted: true };
    });
  }

  async resolveCitation(
    actor_sub: string,
    conversation_id: string,
    citation_id: string,
  ): Promise<ResolvedCitationResponseDto> {
    return withActor(actor_sub, async (_db, client) => {
      const row = await client.query<ResolvedCitationResponseDto>(
        `SELECT a.id,
                a.reference_index,
                a.document_id,
                a.chunk_id,
                a.document_version,
                d.title,
                c.content
         FROM answer_citations a
         JOIN messages m ON m.id = a.message_id
         JOIN conversations conv ON conv.id = m.conversation_id
         JOIN document_chunks c ON c.id = a.chunk_id
         JOIN documents d ON d.id = a.document_id
         WHERE a.id = $1
           AND conv.id = $2
           AND conv.created_by_sub = $3
           AND conv.deleted_at IS NULL
           AND d.deleted_at IS NULL
           AND d.version = a.document_version
           AND NOT answer_has_revoked_evidence(m.id)
           AND can_read_document(a.document_id)`,
        [citation_id, conversation_id, actor_sub],
      );
      if (!row.rowCount) {
        throw new NotFoundException('Citation expired or access revoked');
      }
      return row.rows[0];
    });
  }
}

export const PgConversationsRepository = PostgresConversationsRepository;
