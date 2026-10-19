import { EventEmitter } from 'node:events';
import {
  type ArgumentsHost,
  BadRequestException,
  type CallHandler,
  type ExecutionContext,
  ForbiddenException,
  HttpException,
  HttpStatus,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { firstValueFrom, of, throwError } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { AppModule, HealthController } from '../../src/app.module';
import { pool } from '../../src/database/pool';
import { ConversationsController } from '../../src/modules/conversations/presentation/http/controllers/conversations.controller';
import { EvaluationsController } from '../../src/modules/evaluations/presentation/http/controllers/evaluations.controller';
import { GovernanceController } from '../../src/modules/governance/presentation/http/controllers/governance.controller';
import {
  actorProfileSchema,
  answerResultSchema,
  documentSummarySchema,
  knowledgeBaseSchema,
  searchHitSchema,
  tenantSchema,
} from '../../src/modules/knowledge/domain/schemas/knowledge.schema';
import { KnowledgeController } from '../../src/modules/knowledge/presentation/http/controllers/knowledge.controller';
import { UploadsController } from '../../src/modules/uploads/presentation/http/controllers/uploads.controller';
import { MetricsController } from '../../src/observability/metrics.controller';
import { MetricsInterceptor } from '../../src/observability/metrics.interceptor';
import { requestIdMiddleware } from '../../src/observability/request-id.middleware';
import type { Actor } from '../../src/security/actor';
import { createEndpointRateLimiter } from '../../src/security/rate-limiter';
import { DatabaseExceptionFilter } from '../../src/shared/database-exception.filter';

const ACTOR: Actor = {
  sub: 'user-owner-1',
  email: 'owner@enterprise.local',
};
const UUID_1 = '11111111-1111-4111-8111-111111111111';
const UUID_2 = '22222222-2222-4222-8222-222222222222';

function createMockSseResponse() {
  const emitter = new EventEmitter();
  const headers = new Map<string, string>();
  const chunks: string[] = [];
  let ended = false;
  const res = Object.assign(emitter, {
    destroyed: false,
    headersSent: false,
    setHeader: vi.fn((k: string, v: string) => {
      headers.set(k.toLowerCase(), v);
    }),
    flushHeaders: vi.fn(() => {
      res.headersSent = true;
    }),
    write: vi.fn((chunk: string | Buffer) => {
      chunks.push(typeof chunk === 'string' ? chunk : chunk.toString('utf8'));
      return true;
    }),
    end: vi.fn((chunk?: string | Buffer) => {
      if (chunk) {
        chunks.push(typeof chunk === 'string' ? chunk : chunk.toString('utf8'));
      }
      ended = true;
    }),
  });
  return {
    res: res as unknown as Response,
    headers,
    output: () => chunks.join(''),
    isEnded: () => ended,
    close: () => emitter.emit('close'),
  };
}

describe('HTTP Controllers, SSE Contracts & Cross-Cutting Infrastructure', () => {
  describe('KnowledgeController', () => {
    it('serves CRUD, paginated envelopes, search, answer, and SSE phases/error mappings', async () => {
      const knowledgeService = {
        me: vi.fn().mockResolvedValue(ACTOR),
        tenants: vi.fn().mockResolvedValue({ count: 1, results: [{ id: UUID_1, name: 'Acme' }] }),
        createTenant: vi.fn().mockResolvedValue({ id: UUID_1, name: 'Acme' }),
        knowledgeBases: vi
          .fn()
          .mockResolvedValue({ count: 1, results: [{ id: UUID_2, tenant_id: UUID_1, name: 'Ops KB' }] }),
        createKnowledgeBase: vi.fn().mockResolvedValue({ id: UUID_2, tenant_id: UUID_1, name: 'Ops KB' }),
        updateKnowledgeBase: vi.fn().mockResolvedValue({ id: UUID_2, tenant_id: UUID_1, name: 'Renamed' }),
        deleteKnowledgeBase: vi.fn().mockResolvedValue({ deleted: true }),
        documents: vi.fn().mockResolvedValue({ count: 0, results: [] }),
        createDocument: vi.fn().mockResolvedValue({ id: UUID_1, status: 'queued' }),
      };
      const retrievalService = {
        search: vi.fn().mockResolvedValue([{ chunk_id: UUID_1, score: 0.9 }]),
      };
      const answerService = {
        answer: vi.fn().mockResolvedValue({ answer: 'Grounded [1].', citations: [], abstained: false }),
        answerWithEvidence: vi.fn().mockImplementation(async (_s, _kb, _q, opts) => {
          opts?.onPhase?.('authorized');
          opts?.onPhase?.('retrieval');
          opts?.onPhase?.('generation');
          opts?.onPhase?.('authorization');
          return {
            result: { answer: 'Grounded [1].', citations: [], abstained: false },
            evidence: [],
          };
        }),
      };

      const ctrl = new KnowledgeController(
        knowledgeService as never,
        retrievalService as never,
        answerService as never,
      );

      await expect(ctrl.me(ACTOR)).resolves.toEqual(ACTOR);
      const tenantsPage = await ctrl.tenants(ACTOR, { limit: 10, offset: 0 });
      expect(tenantsPage.count).toBe(1);

      await expect(ctrl.createTenant(ACTOR, { name: 'Acme' })).resolves.toEqual({ id: UUID_1, name: 'Acme' });
      await expect(ctrl.knowledgeBases(ACTOR, { tenant_id: 'not-a-uuid' })).rejects.toBeInstanceOf(
        BadRequestException,
      );
      const kbPage = await ctrl.knowledgeBases(ACTOR, { tenant_id: UUID_1, limit: '10', offset: '0' });
      expect(kbPage.results).toHaveLength(1);

      await expect(ctrl.createKnowledgeBase(ACTOR, { tenant_id: UUID_1, name: 'Ops KB' })).resolves.toEqual({
        id: UUID_2,
        tenant_id: UUID_1,
        name: 'Ops KB',
      });
      await expect(ctrl.updateKnowledgeBase(ACTOR, UUID_2, { name: 'Renamed' })).resolves.toEqual({
        id: UUID_2,
        tenant_id: UUID_1,
        name: 'Renamed',
      });
      await expect(ctrl.deleteKnowledgeBase(ACTOR, UUID_2)).resolves.toEqual({ deleted: true });
      const docsPage = await ctrl.documents(ACTOR, UUID_2, { limit: 10, offset: 0 });
      expect(docsPage.count).toBe(0);
      await expect(
        ctrl.createDocument(ACTOR, UUID_2, { title: 'Doc', text: 'Hello world', visibility: 'private' }),
      ).resolves.toEqual({ id: UUID_1, status: 'queued' });
      await expect(ctrl.search(ACTOR, { knowledge_base_id: UUID_2, query: 'Hello' })).resolves.toHaveLength(
        1,
      );
      await expect(
        ctrl.answer(ACTOR, { knowledge_base_id: UUID_2, question: 'What is Hello?' }),
      ).resolves.toMatchObject({ abstained: false });

      // SSE success
      const okSse = createMockSseResponse();
      await ctrl.streamAnswer(ACTOR, { knowledge_base_id: UUID_2, question: 'What is Hello?' }, okSse.res);
      expect(okSse.headers.get('content-type')).toContain('text/event-stream');
      expect(okSse.output()).toContain('event: status');
      expect(okSse.output()).toContain('event: complete');
      expect(okSse.isEnded()).toBe(true);

      // SSE error mappings: 429, 404, 403, 503
      for (const [err, code] of [
        [new HttpException('Quota', HttpStatus.TOO_MANY_REQUESTS), 'BUDGET_EXHAUSTED'],
        [new NotFoundException('Missing'), 'NOT_FOUND'],
        [new ForbiddenException('Denied'), 'FORBIDDEN'],
        [new Error('Upstream boom'), 'ANSWER_UNAVAILABLE'],
      ] as const) {
        answerService.answerWithEvidence.mockRejectedValueOnce(err);
        const errSse = createMockSseResponse();
        await ctrl.streamAnswer(ACTOR, { knowledge_base_id: UUID_2, question: 'Question?' }, errSse.res);
        expect(errSse.output()).toContain(`"code":"${code}"`);
      }
    });
  });

  describe('ConversationsController', () => {
    it('serves list, create, get, delete, ask, SSE stream, and resolveCitation', async () => {
      const service = {
        list: vi.fn().mockResolvedValue({ count: 1, results: [{ id: UUID_1 }] }),
        create: vi.fn().mockResolvedValue({ id: UUID_1, title: 'Chat' }),
        get: vi.fn().mockResolvedValue({ id: UUID_1, messages: [] }),
        delete: vi.fn().mockResolvedValue({ deleted: true }),
        ask: vi.fn().mockImplementation(async (_s, _id, _q, opts) => {
          opts?.onPhase?.('authorized');
          return { answer: 'Hi [1].', abstained: false, citations: [] };
        }),
        resolveCitation: vi.fn().mockResolvedValue({ id: UUID_2, content: 'Source excerpt' }),
      };
      const ctrl = new ConversationsController(service as never);

      await expect(ctrl.list(ACTOR, { knowledge_base_id: 'bad' })).rejects.toBeInstanceOf(
        BadRequestException,
      );
      const listRes = await ctrl.list(ACTOR, { knowledge_base_id: UUID_2, limit: '5', offset: '0' });
      expect(listRes.count).toBe(1);

      await expect(ctrl.create(ACTOR, { knowledge_base_id: UUID_2, title: 'Chat' })).resolves.toEqual({
        id: UUID_1,
        title: 'Chat',
      });
      await expect(ctrl.get(ACTOR, UUID_1)).resolves.toEqual({ id: UUID_1, messages: [] });
      await expect(ctrl.remove(ACTOR, UUID_1)).resolves.toEqual({ deleted: true });
      await expect(ctrl.ask(ACTOR, UUID_1, { question: 'Hello?' })).resolves.toMatchObject({
        abstained: false,
      });
      await expect(ctrl.resolve(ACTOR, UUID_1, UUID_2)).resolves.toEqual({
        id: UUID_2,
        content: 'Source excerpt',
      });

      const okSse = createMockSseResponse();
      await ctrl.streamAsk(ACTOR, UUID_1, { question: 'Hello?' }, okSse.res);
      expect(okSse.output()).toContain('event: complete');

      for (const [err, code] of [
        [new HttpException('Quota', HttpStatus.TOO_MANY_REQUESTS), 'BUDGET_EXHAUSTED'],
        [new NotFoundException('Missing'), 'NOT_FOUND'],
        [new Error('Down'), 'ANSWER_UNAVAILABLE'],
      ] as const) {
        service.ask.mockRejectedValueOnce(err);
        const errSse = createMockSseResponse();
        await ctrl.streamAsk(ACTOR, UUID_1, { question: 'Hello?' }, errSse.res);
        expect(errSse.output()).toContain(`"code":"${code}"`);
      }
    });
  });

  describe('EvaluationsController', () => {
    it('serves datasets, cases, and runs endpoints including query validation', async () => {
      const service = {
        datasets: vi.fn().mockResolvedValue({ count: 1, results: [{ id: UUID_1 }] }),
        createDataset: vi.fn().mockResolvedValue({ id: UUID_1, name: 'Gold' }),
        deleteDataset: vi.fn().mockResolvedValue({ deleted: true }),
        cases: vi.fn().mockResolvedValue({ count: 1, results: [{ id: UUID_2 }] }),
        addCase: vi.fn().mockResolvedValue({ id: UUID_2 }),
        deleteCase: vi.fn().mockResolvedValue({ deleted: true }),
        runs: vi.fn().mockResolvedValue({ count: 1, results: [{ id: UUID_1 }] }),
        run: vi.fn().mockResolvedValue({ id: UUID_1, status: 'completed' }),
        getRun: vi.fn().mockResolvedValue({ id: UUID_1, results: [] }),
      };
      const ctrl = new EvaluationsController(service as never);

      await expect(ctrl.datasets(ACTOR, { tenant_id: 'invalid' })).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect((await ctrl.datasets(ACTOR, { tenant_id: UUID_1 })).count).toBe(1);
      await expect(
        ctrl.create(ACTOR, { tenant_id: UUID_1, knowledge_base_id: UUID_2, name: 'Gold' }),
      ).resolves.toEqual({ id: UUID_1, name: 'Gold' });
      await expect(ctrl.removeDataset(ACTOR, UUID_1)).resolves.toEqual({ deleted: true });
      expect((await ctrl.cases(ACTOR, UUID_1, { limit: 10, offset: 0 })).count).toBe(1);
      await expect(
        ctrl.add(ACTOR, UUID_1, {
          question: 'Where is policy?',
          expected_document_ids: [UUID_2],
          expected_abstention: false,
        }),
      ).resolves.toEqual({ id: UUID_2 });
      await expect(ctrl.removeCase(ACTOR, UUID_1, UUID_2)).resolves.toEqual({ deleted: true });

      await expect(ctrl.runs(ACTOR, { tenant_id: 'invalid' })).rejects.toBeInstanceOf(BadRequestException);
      expect((await ctrl.runs(ACTOR, { tenant_id: UUID_1 })).count).toBe(1);
      await expect(ctrl.run(ACTOR, { dataset_id: UUID_1 })).resolves.toEqual({
        id: UUID_1,
        status: 'completed',
      });
      await expect(ctrl.detail(ACTOR, UUID_1)).resolves.toEqual({ id: UUID_1, results: [] });
    });
  });

  describe('GovernanceController', () => {
    it('routes all 25 governance, ACL, group, FinOps, audit, and DLQ operations', async () => {
      const gov = {
        members: vi.fn().mockResolvedValue({ count: 1, results: [{ user_sub: 'u1', role: 'owner' }] }),
        addMember: vi.fn().mockResolvedValue({ user_sub: 'u2', role: 'viewer' }),
        changeRole: vi.fn().mockResolvedValue({ user_sub: 'u2', role: 'admin' }),
        removeMember: vi.fn().mockResolvedValue({ removed: true }),
        document: vi.fn().mockResolvedValue({ id: UUID_1, title: 'Doc' }),
        versions: vi.fn().mockResolvedValue({ count: 1, results: [{ version: 1 }] }),
        documentChunks: vi.fn().mockResolvedValue({ count: 1, results: [{ ordinal: 0 }] }),
        grants: vi.fn().mockResolvedValue([{ user_sub: 'u2' }]),
        replaceGrants: vi.fn().mockResolvedValue({ document_id: UUID_1, granted_users: 1 }),
        deleteDocument: vi.fn().mockResolvedValue({ deleted: true }),
        jobs: vi.fn().mockResolvedValue({ id: UUID_2, status: 'completed' }),
        retryJob: vi.fn().mockResolvedValue({ id: UUID_2, status: 'pending' }),
        usage: vi.fn().mockResolvedValue([{ category: 'answer', requests: 2 }]),
        budget: vi.fn().mockResolvedValue({ tenant_id: UUID_1, daily_answer_limit: 100 }),
        updateBudget: vi.fn().mockResolvedValue({ tenant_id: UUID_1, daily_answer_limit: 250 }),
        audit: vi.fn().mockResolvedValue({ count: 1, results: [{ action: 'tenant.created' }] }),
        groups: vi.fn().mockResolvedValue({ count: 1, results: [{ id: UUID_2, name: 'Legal' }] }),
        createGroup: vi.fn().mockResolvedValue({ id: UUID_2, tenant_id: UUID_1, name: 'Legal' }),
        deleteGroup: vi.fn().mockResolvedValue({ removed: true }),
        groupMembers: vi.fn().mockResolvedValue({ count: 1, results: [{ user_sub: 'u2' }] }),
        addGroupMember: vi.fn().mockResolvedValue({ user_sub: 'u2' }),
        removeGroupMember: vi.fn().mockResolvedValue({ removed: true }),
        groupGrants: vi.fn().mockResolvedValue([{ group_id: UUID_2 }]),
        replaceGroupGrants: vi.fn().mockResolvedValue({ document_id: UUID_1, group_count: 1 }),
        listDlq: vi.fn().mockResolvedValue({ count: 1, results: [{ id: UUID_2, source: 'ingestion_job' }] }),
        replayDlq: vi.fn().mockResolvedValue({ id: UUID_2, source: 'ingestion_job', status: 'pending' }),
      };
      const ctrl = new GovernanceController(gov as never);

      expect((await ctrl.members(ACTOR, UUID_1, { limit: 10, offset: 0 })).count).toBe(1);
      await expect(
        ctrl.addMember(ACTOR, UUID_1, { email: 'peer@enterprise.local', role: 'viewer' }),
      ).resolves.toEqual({ user_sub: 'u2', role: 'viewer' });
      await expect(ctrl.change(ACTOR, UUID_1, 'u2', { role: 'admin' })).resolves.toEqual({
        user_sub: 'u2',
        role: 'admin',
      });
      await expect(ctrl.removeMember(ACTOR, UUID_1, 'u2')).resolves.toEqual({ removed: true });
      await expect(ctrl.document(ACTOR, UUID_1)).resolves.toEqual({ id: UUID_1, title: 'Doc' });
      expect((await ctrl.versions(ACTOR, UUID_1, { limit: 10, offset: 0 })).count).toBe(1);
      expect((await ctrl.chunks(ACTOR, UUID_1, { limit: 10, offset: 0 })).count).toBe(1);
      await expect(ctrl.access(ACTOR, UUID_1)).resolves.toHaveLength(1);
      await expect(ctrl.accessReplace(ACTOR, UUID_1, { user_subs: ['u2'] })).resolves.toEqual({
        document_id: UUID_1,
        granted_users: 1,
      });
      await expect(ctrl.deleteDoc(ACTOR, UUID_1)).resolves.toEqual({ deleted: true });
      await expect(ctrl.jobs(ACTOR, UUID_1)).resolves.toEqual({ id: UUID_2, status: 'completed' });
      await expect(ctrl.retry(ACTOR, UUID_1)).resolves.toEqual({ id: UUID_2, status: 'pending' });
      await expect(ctrl.usage(ACTOR, UUID_1)).resolves.toHaveLength(1);
      await expect(ctrl.budget(ACTOR, UUID_1)).resolves.toMatchObject({ daily_answer_limit: 100 });
      await expect(
        ctrl.budgetUpdate(ACTOR, UUID_1, { daily_answer_limit: 250, daily_cost_limit_usd: 50 }),
      ).resolves.toMatchObject({ daily_answer_limit: 250 });

      await expect(ctrl.audit(ACTOR, { tenant_id: 'bad' })).rejects.toBeInstanceOf(BadRequestException);
      expect((await ctrl.audit(ACTOR, { tenant_id: UUID_1 })).count).toBe(1);

      expect((await ctrl.groups(ACTOR, UUID_1, { limit: 10, offset: 0 })).count).toBe(1);
      await expect(ctrl.createGroup(ACTOR, { tenant_id: UUID_1, name: 'Legal' })).resolves.toMatchObject({
        name: 'Legal',
      });
      await expect(ctrl.deleteGroup(ACTOR, UUID_2)).resolves.toEqual({ removed: true });
      expect((await ctrl.groupMembers(ACTOR, UUID_2, { limit: 10, offset: 0 })).count).toBe(1);
      await expect(ctrl.addGroupMember(ACTOR, UUID_2, { user_sub: 'u2' })).resolves.toEqual({
        user_sub: 'u2',
      });
      await expect(ctrl.removeGroupMember(ACTOR, UUID_2, 'u2')).resolves.toEqual({ removed: true });
      await expect(ctrl.groupGrants(ACTOR, UUID_1)).resolves.toHaveLength(1);
      await expect(ctrl.replaceGroupGrants(ACTOR, UUID_1, { group_ids: [UUID_2] })).resolves.toEqual({
        document_id: UUID_1,
        group_count: 1,
      });

      await expect(ctrl.listDlq(ACTOR, { tenant_id: 'bad' })).rejects.toBeInstanceOf(BadRequestException);
      expect((await ctrl.listDlq(ACTOR, { tenant_id: UUID_1 })).count).toBe(1);
      await expect(ctrl.replayDlq(ACTOR, UUID_2, { source: 'ingestion_job' })).resolves.toMatchObject({
        status: 'pending',
      });
    });
  });

  describe('UploadsController', () => {
    it('routes multipart upload, version upload, and hardened binary download headers', async () => {
      const uploadsService = {
        uploadDocument: vi.fn().mockResolvedValue({ id: UUID_1, status: 'queued' }),
        uploadNewVersion: vi.fn().mockResolvedValue({ id: UUID_1, version: 2, status: 'queued' }),
        downloadAuthorizedDocument: vi.fn().mockResolvedValue({
          body: Buffer.from('PDF-BYTES'),
          filename: 'policy.pdf',
        }),
      };
      const ctrl = new UploadsController(uploadsService as never);
      const fakeFile = {
        originalname: 'policy.txt',
        mimetype: 'text/plain',
        size: 12,
        buffer: Buffer.from('hello policy'),
      };

      await expect(
        ctrl.upload(ACTOR, UUID_2, fakeFile, { body: { visibility: 'private' } }),
      ).resolves.toEqual({ id: UUID_1, status: 'queued' });
      await expect(ctrl.uploadVersion(ACTOR, UUID_1, undefined, { body: { text: 'v2' } })).resolves.toEqual({
        id: UUID_1,
        version: 2,
        status: 'queued',
      });

      const dl = createMockSseResponse();
      await ctrl.download(ACTOR, UUID_1, dl.res);
      expect(dl.headers.get('content-type')).toBe('application/octet-stream');
      expect(dl.headers.get('x-content-type-options')).toBe('nosniff');
      expect(dl.headers.get('content-disposition')).toBe('attachment; filename="policy.pdf"');
      expect(dl.output()).toBe('PDF-BYTES');
    });
  });

  describe('Observability, Exception Filter & Rate Limiter', () => {
    it('exports Prometheus metrics and records static handler labels in MetricsInterceptor', async () => {
      const metricsCtrl = new MetricsController();
      const body = await metricsCtrl.metrics();
      expect(body).toContain('rag_');

      const interceptor = new MetricsInterceptor();
      const ctx = {
        switchToHttp: () => ({ getRequest: () => ({ method: 'GET' }) }),
        getHandler: () => ({ name: 'tenants' }),
      } as unknown as ExecutionContext;

      await expect(
        firstValueFrom(interceptor.intercept(ctx, { handle: () => of('ok') } as CallHandler)),
      ).resolves.toBe('ok');
      await expect(
        firstValueFrom(
          interceptor.intercept(ctx, {
            handle: () => throwError(() => new BadRequestException('invalid')),
          } as CallHandler),
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
      await expect(
        firstValueFrom(
          interceptor.intercept(ctx, {
            handle: () => throwError(() => new Error('boom')),
          } as CallHandler),
        ),
      ).rejects.toThrow('boom');
    });

    it('sanitizes X-Request-Id and maps PostgreSQL SQLSTATE codes deterministically', () => {
      let headerVal = '';
      const locals: Record<string, unknown> = {};
      const next = vi.fn();
      requestIdMiddleware(
        { header: () => 'valid_req-12345' } as unknown as Request,
        {
          setHeader: (_k: string, v: string) => {
            headerVal = v;
          },
          locals,
        } as unknown as Response,
        next,
      );
      expect(headerVal).toBe('valid_req-12345');
      expect(next).toHaveBeenCalledOnce();

      requestIdMiddleware(
        { header: () => 'bad header\r\ninjection' } as unknown as Request,
        {
          setHeader: (_k: string, v: string) => {
            headerVal = v;
          },
          locals,
        } as unknown as Response,
        next,
      );
      expect(headerVal).toMatch(/^[0-9a-f-]{36}$/i);

      const filter = new DatabaseExceptionFilter();
      const runFilter = (err: unknown, headersSent = false) => {
        let code = 0;
        let payload: unknown;
        const host = {
          switchToHttp: () => ({
            getResponse: () => ({
              headersSent,
              status: (s: number) => {
                code = s;
                return {
                  json: (p: unknown) => {
                    payload = p;
                  },
                };
              },
            }),
          }),
        } as unknown as ArgumentsHost;
        filter.catch(err, host);
        return { code, payload };
      };

      expect(runFilter(new Error('ignored'), true).code).toBe(0);
      expect(runFilter(new BadRequestException('bad')).code).toBe(400);
      expect(runFilter({ code: '42501', message: 'rls' }).code).toBe(403);
      expect(runFilter({ code: 'P0002', message: 'missing' }).code).toBe(404);
      expect(runFilter({ code: 'P0029', message: 'quota' }).code).toBe(429);
      expect(runFilter({ code: '23505', message: 'dup' }).code).toBe(409);
      expect(runFilter({ code: '23503', message: 'fk' }).code).toBe(400);
      expect(runFilter(new Error('unhandled')).code).toBe(500);
    });

    it('validates HealthController, AppModule, domain schemas, and rate-limiter keyGenerator', async () => {
      expect(new AppModule()).toBeDefined();
      expect(actorProfileSchema.parse(ACTOR)).toEqual(ACTOR);
      expect(tenantSchema.parse({ id: UUID_1, name: 'Acme' }).id).toBe(UUID_1);
      expect(knowledgeBaseSchema.parse({ id: UUID_2, tenant_id: UUID_1, name: 'KB' }).name).toBe('KB');
      expect(
        documentSummarySchema.parse({
          id: UUID_1,
          title: 'Doc',
          visibility: 'private',
          status: 'ready',
          created_at: new Date(),
        }).status,
      ).toBe('ready');
      expect(
        searchHitSchema.parse({
          chunk_id: UUID_1,
          document_id: UUID_2,
          document_version: 1,
          title: 'Doc',
          content: 'Chunk',
          score: 0.9,
        }).score,
      ).toBe(0.9);
      expect(answerResultSchema.parse({ answer: 'A [1].', abstained: false, citations: [] }).abstained).toBe(
        false,
      );

      const health = new HealthController();
      expect(health.live()).toEqual({ status: 'alive' });

      const spy = vi.spyOn(pool, 'query');
      spy.mockResolvedValueOnce({ rows: [{ ready: true }], rowCount: 1 } as never);
      await expect(health.ready()).resolves.toEqual({ status: 'ready' });

      spy.mockResolvedValueOnce({ rows: [{ ready: false }], rowCount: 1 } as never);
      await expect(health.ready()).rejects.toBeInstanceOf(ServiceUnavailableException);
      spy.mockRestore();

      const limiter = createEndpointRateLimiter({ windowMs: 60_000, limit: 5 });
      const invokeLimiter = (authHeader?: string) =>
        new Promise<void>((resolve) => {
          const req = {
            ip: '127.0.0.1',
            method: 'POST',
            headers: authHeader ? { authorization: authHeader } : {},
            app: { get: () => false },
          } as unknown as Request;
          const res = {
            setHeader: vi.fn(),
            status: vi.fn().mockReturnThis(),
            send: vi.fn(),
            json: vi.fn(),
          } as unknown as Response;
          limiter(req, res, (() => resolve()) as NextFunction);
        });
      await invokeLimiter('Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.validtokenpayload');
      await invokeLimiter();
    });
  });
});
