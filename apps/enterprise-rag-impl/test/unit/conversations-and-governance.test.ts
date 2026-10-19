import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockDb = {
  query: vi.fn(),
};

function createDrizzleMock(client: typeof mockDb) {
  const execute = async (): Promise<unknown[]> => {
    const res = (await client.query()) as { rows?: unknown[] } | undefined;
    return res?.rows ?? [];
  };
  const methods = [
    'from',
    'innerJoin',
    'leftJoin',
    'rightJoin',
    'fullJoin',
    'where',
    'groupBy',
    'having',
    'distinct',
    'orderBy',
    'limit',
    'offset',
    'for',
    'set',
    'values',
    'onConflictDoNothing',
    'onConflictDoUpdate',
    'returning',
    'as',
  ];
  const createChain = () => {
    const p = execute();
    const target = p as unknown as Record<string, unknown>;
    for (const m of methods) {
      target[m] = () => target;
    }
    return target;
  };
  return {
    select: () => createChain(),
    insert: () => createChain(),
    update: () => createChain(),
    delete: () => createChain(),
    execute,
  };
}

const mockDrizzle = createDrizzleMock(mockDb);

vi.mock('../../src/database/pool', () => ({
  withActor: vi.fn(async (_sub: string, fn: (db: unknown, client: unknown) => Promise<unknown>) =>
    fn(mockDrizzle, mockDb),
  ),
}));

import { ConversationsService } from '../../src/modules/conversations/application/services/conversations.service';
import { PgConversationsRepository } from '../../src/modules/conversations/infrastructure/persistence/conversations.repository';
import { GovernanceService } from '../../src/modules/governance/application/services/governance.service';
import { PgGovernanceRepository } from '../../src/modules/governance/infrastructure/persistence/governance.repository';

const TENANT = '11111111-1111-4111-8111-111111111111';
const KB = '22222222-2222-4222-8222-222222222222';
const DOC = '33333333-3333-4333-8333-333333333333';
const CONV = '44444444-4444-4444-8444-444444444444';
const GROUP = '55555555-5555-4555-8555-555555555555';
const CHUNK = '66666666-6666-4666-8666-666666666666';

describe('Conversations & Governance Services + PostgreSQL Persistence', () => {
  beforeEach(() => {
    mockDb.query.mockReset();
  });

  describe('ConversationsService & PgConversationsRepository', () => {
    it('orchestrates list, create, get (with live revocation redaction), ask, persistTurn, delete, and resolveCitation', async () => {
      const repo = new PgConversationsRepository();
      const answerService = {
        answerWithEvidence: vi.fn().mockResolvedValue({
          result: {
            answer: 'Policy is zero trust [1].',
            abstained: false,
            citations: [
              {
                index: 1,
                document_id: DOC,
                chunk_id: CHUNK,
                document_version: 1,
                title: 'Sec Doc',
              },
            ],
          },
          evidence: [{ document_id: DOC, chunk_id: CHUNK, document_version: 1 }],
        }),
      };
      const service = new ConversationsService(answerService as never, repo);

      // list
      mockDb.query
        .mockResolvedValueOnce({ rows: [{ count: 1 }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ id: CONV, title: 'Sec Chat' }], rowCount: 1 });
      const listed = await service.list('u1', KB, { limit: 10, offset: 0 });
      expect(listed.count).toBe(1);

      // create 404 & 201
      mockDb.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
      await expect(service.create('u1', KB, 'Chat')).rejects.toBeInstanceOf(NotFoundException);

      mockDb.query
        .mockResolvedValueOnce({ rows: [{ tenant_id: TENANT }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ id: CONV, tenant_id: TENANT, title: 'Chat' }], rowCount: 1 });
      await expect(service.create('u1', KB, 'Chat')).resolves.toMatchObject({ id: CONV });

      // get 404 & get with active + revoked assistant messages
      mockDb.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
      await expect(service.get('u1', CONV)).rejects.toBeInstanceOf(NotFoundException);

      mockDb.query
        .mockResolvedValueOnce({ rows: [{ id: CONV, knowledge_base_id: KB, title: 'Chat' }], rowCount: 1 })
        .mockResolvedValueOnce({
          rows: [
            { id: 'm1', role: 'assistant', content: 'Valid [1].', abstained: false, revoked: false },
            {
              id: 'm2',
              role: 'assistant',
              content: 'Respuesta ocultada: una fuente ya no está autorizada.',
              abstained: true,
              revoked: true,
            },
          ],
          rowCount: 2,
        })
        .mockResolvedValueOnce({
          rows: [{ id: 'c1', message_id: 'm1', document_id: DOC, chunk_id: CHUNK, reference_index: 1 }],
          rowCount: 1,
        });
      const detail = (await service.get('u1', CONV)) as { messages: Array<{ citations: unknown[] }> };
      expect(detail.messages[0].citations).toHaveLength(1);
      expect(detail.messages[1].citations).toHaveLength(0);

      // ask -> getKnowledgeBaseForConversation + persistTurn (happy path)
      mockDb.query
        .mockResolvedValueOnce({ rows: [{ knowledge_base_id: KB }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ 1: 1 }], rowCount: 1 }) // FOR UPDATE
        .mockResolvedValueOnce({ rows: [{ id: 'u-msg' }], rowCount: 1 }) // user msg
        .mockResolvedValueOnce({ rows: [{ matched: 1 }], rowCount: 1 }) // active evidence check
        .mockResolvedValueOnce({ rows: [{ id: 'a-msg' }], rowCount: 1 }) // assistant msg
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // answer_evidence
        .mockResolvedValueOnce({ rows: [{ 1: 1 }], rowCount: 1 }) // allowed chunk
        .mockResolvedValueOnce({ rows: [{ id: 'cit-1' }], rowCount: 1 }); // answer_citations

      const turn = await service.ask('u1', CONV, 'What is the policy?');
      expect(turn.abstained).toBe(false);
      expect(turn.citations).toHaveLength(1);

      // persistTurn when evidence is revoked mid-flight
      mockDb.query
        .mockResolvedValueOnce({ rows: [{ 1: 1 }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ id: 'u-msg-2' }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ matched: 0 }], rowCount: 1 }) // mismatch -> redact!
        .mockResolvedValueOnce({ rows: [{ id: 'a-msg-2' }], rowCount: 1 });
      const redactedTurn = await repo.persistTurn(
        'u1',
        CONV,
        'Secret?',
        { answer: 'Leak [1].', citations: [], abstained: false },
        [{ document_id: DOC, chunk_id: CHUNK, document_version: 1 }],
      );
      expect(redactedTurn.abstained).toBe(true);

      // deleteConversation 404 & 200
      mockDb.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
      await expect(service.delete('u1', CONV)).rejects.toBeInstanceOf(NotFoundException);

      mockDb.query
        .mockResolvedValueOnce({ rows: [{ tenant_id: TENANT }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 });
      await expect(service.delete('u1', CONV)).resolves.toEqual({ deleted: true });

      // resolveCitation 404 & 200
      mockDb.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
      await expect(service.resolveCitation('u1', CONV, 'cit-1')).rejects.toBeInstanceOf(NotFoundException);

      mockDb.query.mockResolvedValueOnce({ rows: [{ id: 'cit-1', content: 'Zero trust' }], rowCount: 1 });
      await expect(service.resolveCitation('u1', CONV, 'cit-1')).resolves.toMatchObject({ id: 'cit-1' });
    });
  });

  describe('GovernanceService & PgGovernanceRepository', () => {
    it('enforces RBAC, last-owner invariant, ACL grants, groups, FinOps budgets, and DLQ replay', async () => {
      const repo = new PgGovernanceRepository();
      const gov = new GovernanceService(repo);

      // members: 404 & 200
      mockDb.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
      await expect(gov.members('u1', TENANT)).rejects.toBeInstanceOf(NotFoundException);

      mockDb.query
        .mockResolvedValueOnce({ rows: [{ 1: 1 }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ count: 1 }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ user_sub: 'u1', email: 'a@b.c', role: 'owner' }], rowCount: 1 });
      expect((await gov.members('u1', TENANT)).count).toBe(1);

      // changeRole: non-owner 403, last-owner 400, happy 200
      mockDb.query.mockResolvedValueOnce({ rows: [{ role: 'admin' }], rowCount: 1 });
      await expect(gov.changeRole('u2', TENANT, 'u1', 'viewer')).rejects.toBeInstanceOf(ForbiddenException);

      mockDb.query
        .mockResolvedValueOnce({ rows: [{ role: 'owner' }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ role: 'owner' }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ total: 1 }], rowCount: 1 });
      await expect(gov.changeRole('u1', TENANT, 'u1', 'admin')).rejects.toBeInstanceOf(BadRequestException);

      mockDb.query
        .mockResolvedValueOnce({ rows: [{ role: 'owner' }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ role: 'viewer' }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ user_sub: 'u2', role: 'admin' }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 });
      await expect(gov.changeRole('u1', TENANT, 'u2', 'admin')).resolves.toEqual({
        user_sub: 'u2',
        role: 'admin',
      });

      // addMember & removeMember
      mockDb.query
        .mockResolvedValueOnce({ rows: [{ 1: 1 }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ user_sub: 'u3' }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ user_sub: 'u3', role: 'viewer' }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 });
      await expect(gov.addMember('u1', TENANT, 'u3@b.c', 'viewer')).resolves.toEqual({
        user_sub: 'u3',
        role: 'viewer',
      });

      mockDb.query
        .mockResolvedValueOnce({ rows: [{ role: 'owner' }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ role: 'viewer' }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 });
      await expect(gov.removeMember('u1', TENANT, 'u3')).resolves.toEqual({ removed: true });

      // document, versions, chunks
      mockDb.query.mockResolvedValueOnce({ rows: [{ id: DOC, title: 'Doc' }], rowCount: 1 });
      await expect(gov.document('u1', DOC)).resolves.toMatchObject({ id: DOC });

      mockDb.query
        .mockResolvedValueOnce({ rows: [{ 1: 1 }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ count: 1 }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ version: 1 }], rowCount: 1 });
      expect((await gov.versions('u1', DOC)).count).toBe(1);

      mockDb.query
        .mockResolvedValueOnce({ rows: [{ 1: 1 }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ count: 1 }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ ordinal: 0, content: 'Hello' }], rowCount: 1 });
      expect((await gov.documentChunks('u1', DOC)).count).toBe(1);

      // grants & replaceGrants & deleteDocument
      mockDb.query
        .mockResolvedValueOnce({ rows: [{ id: DOC, tenant_id: TENANT, owner_sub: 'u1' }], rowCount: 1 })
        .mockResolvedValueOnce({
          rows: [{ user_sub: 'u2', email: 'u2@b.c', created_at: new Date() }],
          rowCount: 1,
        });
      await expect(gov.grants('u1', DOC)).resolves.toHaveLength(1);

      mockDb.query
        .mockResolvedValueOnce({ rows: [{ tenant_id: TENANT, owner_sub: 'u1' }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ user_sub: 'u2' }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 });
      await expect(gov.replaceGrants('u1', DOC, ['u2'])).resolves.toEqual({
        document_id: DOC,
        granted_users: 1,
      });

      mockDb.query
        .mockResolvedValueOnce({
          rows: [{ tenant_id: TENANT, owner_sub: 'u1', file_path: 'clean/key.pdf' }],
          rowCount: 1,
        })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 });
      await expect(gov.deleteDocument('u1', DOC)).resolves.toEqual({ deleted: true });

      // jobs & retryJob (verifies error_message = NULL SQL)
      mockDb.query.mockResolvedValueOnce({ rows: [{ id: 'job-1', status: 'failed' }], rowCount: 1 });
      await expect(gov.jobs('u1', DOC)).resolves.toMatchObject({ id: 'job-1' });

      mockDb.query
        .mockResolvedValueOnce({ rows: [{ tenant_id: TENANT }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ id: 'job-1' }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 });
      await expect(gov.retryJob('u1', DOC)).resolves.toEqual({ id: 'job-1', status: 'pending' });

      // usage, budget (default & persisted), updateBudget, audit
      mockDb.query.mockResolvedValueOnce({ rows: [{ 1: 1 }], rowCount: 1 }).mockResolvedValueOnce({
        rows: [
          {
            category: 'answer',
            requests: 3,
            input_tokens: '120',
            output_tokens: '40',
            cost_usd: '0.01',
            average_latency_ms: 45,
          },
        ],
        rowCount: 1,
      });
      const usage = await gov.usage('u1', TENANT);
      expect(usage[0].input_tokens).toBe(120);

      mockDb.query
        .mockResolvedValueOnce({ rows: [{ 1: 1 }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 });
      await expect(gov.budget('u1', TENANT)).resolves.toMatchObject({ daily_answer_limit: 100 });

      mockDb.query
        .mockResolvedValueOnce({ rows: [{ 1: 1 }], rowCount: 1 })
        .mockResolvedValueOnce({
          rows: [
            {
              tenant_id: TENANT,
              daily_answer_limit: 300,
              daily_cost_limit_usd: '50.5',
              updated_at: new Date(),
            },
          ],
          rowCount: 1,
        })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 });
      await expect(gov.updateBudget('u1', TENANT, 300, 50.5)).resolves.toMatchObject({
        daily_answer_limit: 300,
        daily_cost_limit_usd: 50.5,
      });

      mockDb.query
        .mockResolvedValueOnce({ rows: [{ 1: 1 }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ count: 1 }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ id: 'ae-1', action: 'budget.updated' }], rowCount: 1 });
      expect((await gov.audit('u1', TENANT)).count).toBe(1);

      // groups, createGroup, groupMembers, addGroupMember, removeGroupMember, groupGrants, replaceGroupGrants, deleteGroup
      mockDb.query
        .mockResolvedValueOnce({ rows: [{ 1: 1 }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ count: 1 }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ id: GROUP, name: 'SecOps', member_count: 1 }], rowCount: 1 });
      expect((await gov.groups('u1', TENANT)).count).toBe(1);

      mockDb.query
        .mockResolvedValueOnce({ rows: [{ 1: 1 }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ id: GROUP, tenant_id: TENANT, name: 'SecOps' }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 });
      await expect(gov.createGroup('u1', TENANT, 'SecOps')).resolves.toMatchObject({ id: GROUP });

      mockDb.query
        .mockResolvedValueOnce({ rows: [{ id: GROUP }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ user_sub: 'u2', email: 'u2@b.c' }], rowCount: 1 });
      expect((await gov.groupMembers('u1', GROUP)).count).toBe(1);

      mockDb.query
        .mockResolvedValueOnce({ rows: [{ tenant_id: TENANT }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ 1: 1 }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ 1: 1 }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ user_sub: 'u2' }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 });
      await expect(gov.addGroupMember('u1', GROUP, 'u2')).resolves.toEqual({ user_sub: 'u2' });

      mockDb.query
        .mockResolvedValueOnce({ rows: [{ tenant_id: TENANT }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ 1: 1 }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ user_sub: 'u2' }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 });
      await expect(gov.removeGroupMember('u1', GROUP, 'u2')).resolves.toEqual({ removed: true });

      mockDb.query
        .mockResolvedValueOnce({ rows: [{ tenant_id: TENANT, owner_sub: 'u1' }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ group_id: GROUP }], rowCount: 1 });
      await expect(gov.groupGrants('u1', DOC)).resolves.toEqual([{ group_id: GROUP }]);

      mockDb.query
        .mockResolvedValueOnce({ rows: [{ tenant_id: TENANT, owner_sub: 'u1' }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ id: GROUP }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 });
      await expect(gov.replaceGroupGrants('u1', DOC, [GROUP])).resolves.toEqual({
        document_id: DOC,
        group_count: 1,
      });

      mockDb.query
        .mockResolvedValueOnce({ rows: [{ tenant_id: TENANT }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ 1: 1 }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 });
      await expect(gov.deleteGroup('u1', GROUP)).resolves.toEqual({ removed: true });

      // listDlq & replayDlq (both ingestion_job & outbox_event)
      mockDb.query
        .mockResolvedValueOnce({ rows: [{ 1: 1 }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ count: 1 }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ id: 'job-1', source: 'ingestion_job' }], rowCount: 1 });
      expect((await gov.listDlq('u1', TENANT)).count).toBe(1);

      mockDb.query
        .mockResolvedValueOnce({ rows: [{ id: 'job-1', document_id: DOC, tenant_id: TENANT }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ 1: 1 }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 });
      await expect(gov.replayDlq('u1', 'job-1', 'ingestion_job')).resolves.toEqual({
        id: 'job-1',
        source: 'ingestion_job',
        status: 'pending',
      });

      mockDb.query
        .mockResolvedValueOnce({ rows: [{ id: 'evt-1', tenant_id: TENANT }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ 1: 1 }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 });
      await expect(gov.replayDlq('u1', 'evt-1', 'outbox_event')).resolves.toEqual({
        id: 'evt-1',
        source: 'outbox_event',
        status: 'pending',
      });

      // Negative 403/404/400 branches across PgGovernanceRepository
      mockDb.query.mockResolvedValueOnce({ rows: [{ role: 'viewer' }], rowCount: 1 });
      await expect(gov.removeMember('u3', TENANT, 'u1')).rejects.toBeInstanceOf(ForbiddenException);

      mockDb.query
        .mockResolvedValueOnce({ rows: [{ role: 'admin' }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ role: 'owner' }], rowCount: 1 });
      await expect(gov.removeMember('u2', TENANT, 'u1')).rejects.toBeInstanceOf(ForbiddenException);

      mockDb.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
      await expect(gov.document('u1', DOC)).rejects.toBeInstanceOf(NotFoundException);

      mockDb.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
      await expect(gov.versions('u1', DOC)).rejects.toBeInstanceOf(NotFoundException);

      mockDb.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
      await expect(gov.documentChunks('u1', DOC)).rejects.toBeInstanceOf(NotFoundException);

      mockDb.query
        .mockResolvedValueOnce({ rows: [{ id: DOC, tenant_id: TENANT, owner_sub: 'other' }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ ok: false }], rowCount: 1 });
      await expect(gov.grants('u3', DOC)).rejects.toBeInstanceOf(ForbiddenException);

      mockDb.query
        .mockResolvedValueOnce({ rows: [{ tenant_id: TENANT, owner_sub: 'u1' }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 });
      await expect(gov.replaceGrants('u1', DOC, ['outsider'])).rejects.toBeInstanceOf(BadRequestException);

      mockDb.query
        .mockResolvedValueOnce({
          rows: [{ tenant_id: TENANT, owner_sub: 'other', file_path: null }],
          rowCount: 1,
        })
        .mockResolvedValueOnce({ rows: [{ ok: false }], rowCount: 1 });
      await expect(gov.deleteDocument('u3', DOC)).rejects.toBeInstanceOf(ForbiddenException);

      mockDb.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
      await expect(gov.jobs('u1', DOC)).rejects.toBeInstanceOf(NotFoundException);

      mockDb.query
        .mockResolvedValueOnce({ rows: [{ tenant_id: TENANT }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 });
      await expect(gov.retryJob('u1', DOC)).rejects.toBeInstanceOf(BadRequestException);

      mockDb.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
      await expect(gov.usage('u3', TENANT)).rejects.toBeInstanceOf(ForbiddenException);

      mockDb.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
      await expect(gov.updateBudget('u3', TENANT, 10)).rejects.toBeInstanceOf(ForbiddenException);

      mockDb.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
      await expect(gov.audit('u3', TENANT)).rejects.toBeInstanceOf(ForbiddenException);

      mockDb.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
      await expect(gov.listDlq('u3', TENANT)).rejects.toBeInstanceOf(ForbiddenException);

      mockDb.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
      await expect(gov.replayDlq('u1', 'job-x', 'ingestion_job')).rejects.toBeInstanceOf(NotFoundException);

      mockDb.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
      await expect(gov.replayDlq('u1', 'evt-x', 'outbox_event')).rejects.toBeInstanceOf(NotFoundException);

      // Group, member, budget, and DLQ RBAC/not-found branches
      mockDb.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
      await expect(gov.budget('u3', TENANT)).rejects.toBeInstanceOf(NotFoundException);

      mockDb.query.mockResolvedValueOnce({ rows: [{ 1: 1 }], rowCount: 1 }).mockResolvedValueOnce({
        rows: [
          { tenant_id: TENANT, daily_answer_limit: 50, daily_cost_limit_usd: '12.5', updated_at: new Date() },
        ],
        rowCount: 1,
      });
      await expect(gov.budget('u1', TENANT)).resolves.toMatchObject({ daily_cost_limit_usd: 12.5 });

      mockDb.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
      await expect(gov.addMember('u3', TENANT, 'a@b.c', 'viewer')).rejects.toBeInstanceOf(ForbiddenException);

      mockDb.query
        .mockResolvedValueOnce({ rows: [{ 1: 1 }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 });
      await expect(gov.addMember('u1', TENANT, 'missing@b.c', 'viewer')).rejects.toBeInstanceOf(
        NotFoundException,
      );

      mockDb.query
        .mockResolvedValueOnce({ rows: [{ 1: 1 }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ user_sub: 'u2' }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 });
      await expect(gov.addMember('u1', TENANT, 'u2@b.c', 'viewer')).rejects.toBeInstanceOf(
        BadRequestException,
      );

      mockDb.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
      await expect(gov.groups('u3', TENANT)).rejects.toBeInstanceOf(NotFoundException);

      mockDb.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
      await expect(gov.createGroup('u3', TENANT, 'G')).rejects.toBeInstanceOf(ForbiddenException);

      mockDb.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
      await expect(gov.deleteGroup('u1', GROUP)).rejects.toBeInstanceOf(NotFoundException);

      mockDb.query
        .mockResolvedValueOnce({ rows: [{ tenant_id: TENANT }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 });
      await expect(gov.deleteGroup('u3', GROUP)).rejects.toBeInstanceOf(ForbiddenException);

      mockDb.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
      await expect(gov.groupMembers('u1', GROUP)).rejects.toBeInstanceOf(NotFoundException);

      mockDb.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
      await expect(gov.addGroupMember('u1', GROUP, 'u2')).rejects.toBeInstanceOf(NotFoundException);

      mockDb.query
        .mockResolvedValueOnce({ rows: [{ tenant_id: TENANT }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 });
      await expect(gov.addGroupMember('u3', GROUP, 'u2')).rejects.toBeInstanceOf(ForbiddenException);

      mockDb.query
        .mockResolvedValueOnce({ rows: [{ tenant_id: TENANT }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ 1: 1 }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 });
      await expect(gov.addGroupMember('u1', GROUP, 'outsider')).rejects.toBeInstanceOf(BadRequestException);

      mockDb.query
        .mockResolvedValueOnce({ rows: [{ tenant_id: TENANT }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ 1: 1 }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ 1: 1 }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 });
      await expect(gov.addGroupMember('u1', GROUP, 'u2')).rejects.toBeInstanceOf(BadRequestException);

      mockDb.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
      await expect(gov.removeGroupMember('u1', GROUP, 'u2')).rejects.toBeInstanceOf(NotFoundException);

      mockDb.query
        .mockResolvedValueOnce({ rows: [{ tenant_id: TENANT }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 });
      await expect(gov.removeGroupMember('u3', GROUP, 'u2')).rejects.toBeInstanceOf(ForbiddenException);

      mockDb.query
        .mockResolvedValueOnce({ rows: [{ tenant_id: TENANT }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ 1: 1 }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 });
      await expect(gov.removeGroupMember('u1', GROUP, 'u2')).rejects.toBeInstanceOf(NotFoundException);

      mockDb.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
      await expect(gov.groupGrants('u1', DOC)).rejects.toBeInstanceOf(NotFoundException);

      mockDb.query
        .mockResolvedValueOnce({ rows: [{ tenant_id: TENANT, owner_sub: 'other' }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ ok: false }], rowCount: 1 });
      await expect(gov.groupGrants('u3', DOC)).rejects.toBeInstanceOf(ForbiddenException);

      mockDb.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
      await expect(gov.replaceGroupGrants('u1', DOC, [GROUP])).rejects.toBeInstanceOf(NotFoundException);

      mockDb.query
        .mockResolvedValueOnce({ rows: [{ tenant_id: TENANT, owner_sub: 'other' }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ ok: false }], rowCount: 1 });
      await expect(gov.replaceGroupGrants('u3', DOC, [GROUP])).rejects.toBeInstanceOf(ForbiddenException);

      mockDb.query
        .mockResolvedValueOnce({ rows: [{ tenant_id: TENANT, owner_sub: 'u1' }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 });
      await expect(gov.replaceGroupGrants('u1', DOC, [GROUP])).rejects.toBeInstanceOf(BadRequestException);

      mockDb.query
        .mockResolvedValueOnce({ rows: [{ id: 'job-1', document_id: DOC, tenant_id: TENANT }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 });
      await expect(gov.replayDlq('u3', 'job-1', 'ingestion_job')).rejects.toBeInstanceOf(ForbiddenException);

      mockDb.query
        .mockResolvedValueOnce({ rows: [{ id: 'evt-1', tenant_id: TENANT }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 });
      await expect(gov.replayDlq('u3', 'evt-1', 'outbox_event')).rejects.toBeInstanceOf(ForbiddenException);
    });
  });
});
