import { BadRequestException, ForbiddenException, HttpException, NotFoundException } from '@nestjs/common';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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

import { env } from '../../src/config/env';
import { PgEvaluationsRepository } from '../../src/modules/evaluations/infrastructure/persistence/evaluations.repository';
import {
  HttpCrossEncoderRerankerAdapter,
  OllamaEmbeddingAdapter,
  OllamaLlmGeneratorAdapter,
} from '../../src/modules/knowledge/infrastructure/ai/ollama-ai.adapter';
import { PgAnswerBudgetRepository } from '../../src/modules/knowledge/infrastructure/persistence/answer-budget.repository';
import { PgKnowledgeRepository } from '../../src/modules/knowledge/infrastructure/persistence/knowledge.repository';
import { PgRetrievalRepository } from '../../src/modules/knowledge/infrastructure/persistence/retrieval.repository';
import { PgUploadsRepository } from '../../src/modules/uploads/infrastructure/persistence/uploads.repository';

const TENANT = '11111111-1111-4111-8111-111111111111';
const KB = '22222222-2222-4222-8222-222222222222';
const DOC = '33333333-3333-4333-8333-333333333333';
const CHUNK_1 = '66666666-6666-4666-8666-666666666661';
const CHUNK_2 = '66666666-6666-4666-8666-666666666662';

describe('Knowledge, Retrieval, FinOps, Uploads, Evaluations Persistence & AI Adapters', () => {
  const originalFetch = globalThis.fetch;
  const origRerankerEnabled = env.RERANKER_ENABLED;
  const origRerankerUrl = env.RERANKER_URL;

  beforeEach(() => {
    mockDb.query.mockReset();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    env.RERANKER_ENABLED = origRerankerEnabled;
    env.RERANKER_URL = origRerankerUrl;
  });

  it('exercises PgKnowledgeRepository CRUD, storage_deletions scheduling, and 100-doc KB quota', async () => {
    const repo = new PgKnowledgeRepository();

    mockDb.query.mockResolvedValueOnce({ rows: [], rowCount: 1 });
    await expect(repo.me({ sub: 'u1', email: 'u1@b.c' })).resolves.toMatchObject({ sub: 'u1' });

    mockDb.query
      .mockResolvedValueOnce({ rows: [{ count: 1 }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [{ id: TENANT, name: 'Acme' }], rowCount: 1 });
    expect((await repo.tenants('u1')).count).toBe(1);

    mockDb.query
      .mockResolvedValueOnce({ rows: [], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [{ id: TENANT, name: 'Acme' }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [], rowCount: 1 });
    await expect(repo.createTenant('u1', 'Acme')).resolves.toEqual({ id: TENANT, name: 'Acme' });

    mockDb.query
      .mockResolvedValueOnce({ rows: [{ id: KB, tenant_id: TENANT, name: 'KB' }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [], rowCount: 1 });
    await expect(repo.createKnowledgeBase('u1', TENANT, 'KB')).resolves.toMatchObject({ id: KB });

    mockDb.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    await expect(repo.updateKnowledgeBase('u1', KB, 'New')).rejects.toBeInstanceOf(NotFoundException);

    mockDb.query
      .mockResolvedValueOnce({ rows: [{ id: KB, tenant_id: TENANT, name: 'New' }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [], rowCount: 1 });
    await expect(repo.updateKnowledgeBase('u1', KB, 'New')).resolves.toMatchObject({ name: 'New' });

    // deleteKnowledgeBase: 404, 403, and 200 with S3 erasure rows
    mockDb.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    await expect(repo.deleteKnowledgeBase('u1', KB)).rejects.toBeInstanceOf(NotFoundException);

    mockDb.query
      .mockResolvedValueOnce({ rows: [{ id: KB, tenant_id: TENANT }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [{ ok: false }], rowCount: 1 });
    await expect(repo.deleteKnowledgeBase('u1', KB)).rejects.toBeInstanceOf(ForbiddenException);

    mockDb.query
      .mockResolvedValueOnce({ rows: [{ id: KB, tenant_id: TENANT }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [{ ok: true }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [{ id: DOC, file_path: 'clean/a.pdf' }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [], rowCount: 1 });
    await expect(repo.deleteKnowledgeBase('u1', KB)).resolves.toEqual({ deleted: true });

    mockDb.query.mockResolvedValueOnce({ rows: [{ count: 1 }], rowCount: 1 }).mockResolvedValueOnce({
      rows: [{ id: DOC, title: 'D1', visibility: 'private', status: 'ready', created_at: new Date() }],
      rowCount: 1,
    });
    expect((await repo.documents('u1', KB)).count).toBe(1);

    // createDocument: 404, 100-doc limit 403, happy 201
    mockDb.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    await expect(repo.createDocument('u1', KB, 'T', 'Body', 'private')).rejects.toBeInstanceOf(
      NotFoundException,
    );

    mockDb.query
      .mockResolvedValueOnce({ rows: [{ tenant_id: TENANT }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [{ n: 100 }], rowCount: 1 });
    await expect(repo.createDocument('u1', KB, 'T', 'Body', 'private')).rejects.toBeInstanceOf(
      ForbiddenException,
    );

    mockDb.query
      .mockResolvedValueOnce({ rows: [{ tenant_id: TENANT }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [{ n: 2 }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [{ id: DOC, status: 'queued' }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [{ id: 'job-1' }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [], rowCount: 1 });
    await expect(repo.createDocument('u1', KB, 'T', 'Body', 'private')).resolves.toEqual({
      id: DOC,
      status: 'queued',
    });
  });

  it('exercises PgRetrievalRepository (lexical & 1024d hybrid RRF) and PgAnswerBudgetRepository', async () => {
    const retrievalRepo = new PgRetrievalRepository();
    mockDb.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    await expect(retrievalRepo.search('u1', KB, 'policy', null)).rejects.toBeInstanceOf(NotFoundException);

    // lexical-only
    mockDb.query
      .mockResolvedValueOnce({ rows: [{ tenant_id: TENANT }], rowCount: 1 })
      .mockResolvedValueOnce({
        rows: [
          { chunk_id: CHUNK_1, document_id: DOC, document_version: 1, title: 'D', content: 'C', score: 0.8 },
        ],
        rowCount: 1,
      })
      .mockResolvedValueOnce({ rows: [], rowCount: 1 });
    const lex = await retrievalRepo.search('u1', KB, 'policy', null);
    expect(lex).toHaveLength(1);

    // hybrid 1024d RRF
    const vec1024 = Array.from({ length: 1024 }, () => 0.01);
    mockDb.query
      .mockResolvedValueOnce({ rows: [{ tenant_id: TENANT }], rowCount: 1 })
      .mockResolvedValueOnce({
        rows: [
          { chunk_id: CHUNK_1, document_id: DOC, document_version: 1, title: 'D', content: 'C1', score: 0.7 },
        ],
        rowCount: 1,
      })
      .mockResolvedValueOnce({
        rows: [
          { chunk_id: CHUNK_2, document_id: DOC, document_version: 1, title: 'D', content: 'C2', score: 0.9 },
          {
            chunk_id: CHUNK_1,
            document_id: DOC,
            document_version: 1,
            title: 'D',
            content: 'C1',
            score: 0.85,
          },
        ],
        rowCount: 2,
      })
      .mockResolvedValueOnce({ rows: [], rowCount: 1 });
    const hybrid = await retrievalRepo.search('u1', KB, 'policy', vec1024);
    expect(hybrid[0].chunk_id).toBe(CHUNK_1); // boosted by appearing in both lexical & semantic!

    // PgAnswerBudgetRepository
    const budgetRepo = new PgAnswerBudgetRepository();
    mockDb.query.mockResolvedValueOnce({ rows: [{ id: 'usage-1' }], rowCount: 1 });
    await expect(budgetRepo.reserveBudget('u1', KB)).resolves.toBe('usage-1');

    mockDb.query.mockRejectedValueOnce({ code: 'P0002', message: 'not found' });
    await expect(budgetRepo.reserveBudget('u1', KB)).rejects.toBeInstanceOf(NotFoundException);

    mockDb.query.mockRejectedValueOnce({ code: 'P0029', message: 'Daily limit exceeded' });
    await expect(budgetRepo.reserveBudget('u1', KB)).rejects.toBeInstanceOf(HttpException);

    mockDb.query.mockResolvedValueOnce({ rows: [], rowCount: 1 });
    await budgetRepo.finalizeUsage('u1', 'usage-1', 120, 45, 310);

    await expect(budgetRepo.allEvidenceStillAuthorized('u1', [])).resolves.toBe(true);
    mockDb.query.mockResolvedValueOnce({ rows: [{ matched: 1 }], rowCount: 1 });
    await expect(
      budgetRepo.allEvidenceStillAuthorized('u1', [
        { chunk_id: CHUNK_1, document_id: DOC, document_version: 1, title: 'D', content: 'C', score: 1 },
      ]),
    ).resolves.toBe(true);
  });

  it('exercises PgUploadsRepository and PgEvaluationsRepository', async () => {
    const uploadsRepo = new PgUploadsRepository();

    mockDb.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    await expect(uploadsRepo.assertCanUploadToKnowledgeBase('u1', KB)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    mockDb.query.mockResolvedValueOnce({ rows: [{ 1: 1 }], rowCount: 1 });
    await expect(uploadsRepo.assertCanUploadToKnowledgeBase('u1', KB)).resolves.toBeUndefined();

    mockDb.query
      .mockResolvedValueOnce({ rows: [{ tenant_id: TENANT, owner_sub: 'other' }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [{ ok: false }], rowCount: 1 });
    await expect(uploadsRepo.assertCanVersionDocument('u1', DOC)).rejects.toBeInstanceOf(ForbiddenException);

    mockDb.query.mockResolvedValueOnce({ rows: [{ tenant_id: TENANT, owner_sub: 'u1' }], rowCount: 1 });
    await expect(uploadsRepo.assertCanVersionDocument('u1', DOC)).resolves.toEqual({ tenant_id: TENANT });

    mockDb.query
      .mockResolvedValueOnce({ rows: [{ tenant_id: TENANT }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [{ n: 1 }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [{ id: DOC, status: 'queued' }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [{ id: 'job-1' }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [], rowCount: 1 });
    await expect(
      uploadsRepo.persistUploadedDocument({
        sub: 'u1',
        kb_id: KB,
        title: 'Spec',
        visibility: 'private',
        original_filename: 'spec.pdf',
        media_type: 'application/pdf',
        object_key: 'quarantine/spec.pdf',
        sha256: 'a'.repeat(64),
        byte_size: 256,
      }),
    ).resolves.toEqual({ id: DOC, status: 'queued' });

    mockDb.query
      .mockResolvedValueOnce({
        rows: [{ id: DOC, tenant_id: TENANT, owner_sub: 'u1', file_path: 'clean/old.pdf' }],
        rowCount: 1,
      })
      .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // storage_deletions
      .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // delete chunks
      .mockResolvedValueOnce({ rows: [{ id: DOC, version: 2, status: 'queued' }], rowCount: 1 }) // update doc
      .mockResolvedValueOnce({ rows: [{ id: 'job-1' }], rowCount: 1 }) // update job
      .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // outbox
      .mockResolvedValueOnce({ rows: [], rowCount: 1 }); // audit
    await expect(
      uploadsRepo.persistNewDocumentVersion({
        sub: 'u1',
        document_id: DOC,
        title: 'Spec v2',
        text: undefined,
        original_filename: 'spec-v2.pdf',
        media_type: 'application/pdf',
        object_key: 'quarantine/spec-v2.pdf',
        sha256: 'b'.repeat(64),
        byte_size: 512,
      }),
    ).resolves.toEqual({ id: DOC, version: 2, status: 'queued' });

    mockDb.query.mockResolvedValueOnce({
      rows: [{ file_path: 'clean/spec.pdf', original_filename: 'spec.pdf', media_type: 'application/pdf' }],
      rowCount: 1,
    });
    await expect(uploadsRepo.getAuthorizedDownloadTarget('u1', DOC)).resolves.toMatchObject({
      file_path: 'clean/spec.pdf',
    });

    mockDb.query.mockResolvedValueOnce({ rows: [{ 1: 1 }], rowCount: 1 });
    await expect(uploadsRepo.reverifyAuthorizedDownloadTarget('u1', DOC, 'clean/spec.pdf')).resolves.toBe(
      true,
    );

    // PgEvaluationsRepository
    const evalRepo = new PgEvaluationsRepository();
    mockDb.query
      .mockResolvedValueOnce({ rows: [{ count: 1 }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [{ id: 'ds-1', name: 'Gold' }], rowCount: 1 });
    expect((await evalRepo.datasets('u1', TENANT)).count).toBe(1);

    mockDb.query
      .mockResolvedValueOnce({ rows: [{ 1: 1 }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [{ id: 'ds-1', name: 'Gold', revision: 1 }], rowCount: 1 });
    await expect(evalRepo.createDataset('u1', TENANT, KB, 'Gold')).resolves.toMatchObject({ id: 'ds-1' });

    mockDb.query
      .mockResolvedValueOnce({ rows: [{ tenant_id: TENANT }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [{ ok: true }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [], rowCount: 1 });
    await expect(evalRepo.deleteDataset('u1', 'ds-1')).resolves.toEqual({ deleted: true });

    mockDb.query
      .mockResolvedValueOnce({ rows: [{ 1: 1 }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [{ count: 1 }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [{ id: 'c-1', question: 'Q?' }], rowCount: 1 });
    expect((await evalRepo.cases('u1', 'ds-1')).count).toBe(1);

    // addCase invalid abstention vs valid positive
    mockDb.query.mockResolvedValueOnce({ rows: [{ knowledge_base_id: KB }], rowCount: 1 });
    await expect(evalRepo.addCase('u1', 'ds-1', 'Q?', [DOC], true)).rejects.toBeInstanceOf(
      BadRequestException,
    );

    mockDb.query
      .mockResolvedValueOnce({ rows: [{ knowledge_base_id: KB }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [{ id: DOC }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [{ id: 'c-1', question: 'Q?' }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [], rowCount: 1 });
    await expect(evalRepo.addCase('u1', 'ds-1', 'Q?', [DOC], false)).resolves.toMatchObject({ id: 'c-1' });

    mockDb.query
      .mockResolvedValueOnce({ rows: [{ tenant_id: TENANT }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [{ ok: true }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [{ id: 'c-1' }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [], rowCount: 1 });
    await expect(evalRepo.deleteCase('u1', 'ds-1', 'c-1')).resolves.toEqual({ deleted: true });

    mockDb.query.mockResolvedValueOnce({ rows: [{ count: 1 }], rowCount: 1 }).mockResolvedValueOnce({
      rows: [{ id: 'run-1', recall_at_6: '1.0', mrr_at_6: '1.0', ndcg_at_6: '1.0', precision_at_6: '0.5' }],
      rowCount: 1,
    });
    expect((await evalRepo.runs('u1', TENANT)).results[0]).toMatchObject({ recall_at_6: 1 });

    mockDb.query
      .mockResolvedValueOnce({ rows: [{ id: 'run-1', recall_at_6: '1.0' }], rowCount: 1 })
      .mockResolvedValueOnce({
        rows: [{ case_id: 'c-1', recall_at_6: '1.0', ndcg_at_6: '1.0', precision_at_6: '1.0' }],
        rowCount: 1,
      });
    await expect(evalRepo.getRun('u1', 'run-1')).resolves.toMatchObject({ id: 'run-1' });

    mockDb.query
      .mockResolvedValueOnce({
        rows: [{ tenant_id: TENANT, knowledge_base_id: KB, revision: 2 }],
        rowCount: 1,
      })
      .mockResolvedValueOnce({
        rows: [{ id: 'c-1', question: 'Q?', expected_document_ids: [DOC], expected_abstention: false }],
        rowCount: 1,
      })
      .mockResolvedValueOnce({ rows: [{ id: 'run-2' }], rowCount: 1 });
    await expect(evalRepo.startRun('u1', 'ds-1')).resolves.toMatchObject({ run_id: 'run-2' });

    mockDb.query
      .mockResolvedValueOnce({ rows: [], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [{ id: 'run-2', status: 'completed', recall_at_6: '1' }], rowCount: 1 });
    await expect(
      evalRepo.completeRun(
        'u1',
        TENANT,
        'run-2',
        [
          {
            case_id: 'c-1',
            expected_abstention: false,
            rank_of_first_match: 1,
            recall_at_6: 1,
            mrr_at_6: 1,
            ndcg_at_6: 1,
            precision_at_6: 1,
            abstention_pass: null,
            docs: [DOC],
          },
        ],
        { recall: 1, mrr: 1, ndcg: 1, precision: 1, abstention: null, caseCount: 1, latencyMs: 50 },
      ),
    ).resolves.toMatchObject({ status: 'completed', recall_at_6: 1 });

    mockDb.query.mockResolvedValueOnce({ rows: [], rowCount: 1 });
    await evalRepo.failRun('u1', 'run-2');

    // Negative branches across uploads & evaluations repositories
    mockDb.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    await expect(uploadsRepo.assertCanVersionDocument('u1', DOC)).rejects.toBeInstanceOf(NotFoundException);

    mockDb.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    await expect(uploadsRepo.getAuthorizedDownloadTarget('u1', DOC)).rejects.toBeInstanceOf(
      NotFoundException,
    );

    mockDb.query
      .mockResolvedValueOnce({ rows: [{ tenant_id: TENANT }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [{ n: 100 }], rowCount: 1 });
    await expect(
      uploadsRepo.persistUploadedDocument({
        sub: 'u1',
        kb_id: KB,
        title: 'Spec',
        visibility: 'private',
        original_filename: 'spec.pdf',
        media_type: 'application/pdf',
        object_key: 'quarantine/spec.pdf',
        sha256: 'a'.repeat(64),
        byte_size: 256,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    mockDb.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    await expect(evalRepo.createDataset('u1', TENANT, KB, 'Gold')).rejects.toBeInstanceOf(NotFoundException);

    mockDb.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    await expect(evalRepo.deleteDataset('u1', 'ds-1')).rejects.toBeInstanceOf(NotFoundException);

    mockDb.query
      .mockResolvedValueOnce({ rows: [{ tenant_id: TENANT }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [{ ok: false }], rowCount: 1 });
    await expect(evalRepo.deleteDataset('u3', 'ds-1')).rejects.toBeInstanceOf(ForbiddenException);

    mockDb.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    await expect(evalRepo.cases('u1', 'ds-1')).rejects.toBeInstanceOf(NotFoundException);

    mockDb.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    await expect(evalRepo.getRun('u1', 'run-x')).rejects.toBeInstanceOf(NotFoundException);

    mockDb.query
      .mockResolvedValueOnce({
        rows: [{ tenant_id: TENANT, knowledge_base_id: KB, revision: 1 }],
        rowCount: 1,
      })
      .mockResolvedValueOnce({ rows: [], rowCount: 0 });
    await expect(evalRepo.startRun('u1', 'ds-1')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('validates OllamaEmbeddingAdapter, HttpCrossEncoderRerankerAdapter (including foreign ID rejection), and OllamaLlmGeneratorAdapter', async () => {
    const embedder = new OllamaEmbeddingAdapter();
    const expectedDim = env.EMBEDDING_DIMENSIONS || 1024;
    const validVec = Array.from({ length: expectedDim }, (_, i) => (i === 0 ? 0.5 : 0.01));

    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ embeddings: [validVec] }),
    }) as unknown as typeof fetch;
    await expect(embedder.embedQuery('zero trust')).resolves.toHaveLength(expectedDim);

    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ embeddings: [[0.1, 0.2]] }),
    }) as unknown as typeof fetch;
    await expect(embedder.embedQuery('zero trust')).rejects.toThrow(/dimensionality mismatch/i);

    // HttpCrossEncoderRerankerAdapter
    const reranker = new HttpCrossEncoderRerankerAdapter();
    const hits = [
      { chunk_id: CHUNK_1, document_id: DOC, document_version: 1, title: 'A', content: 'Alpha', score: 0.4 },
      { chunk_id: CHUNK_2, document_id: DOC, document_version: 1, title: 'B', content: 'Beta', score: 0.3 },
    ];

    env.RERANKER_ENABLED = false;
    await expect(reranker.rerank('query', hits, 2)).resolves.toEqual(hits);

    env.RERANKER_ENABLED = true;
    env.RERANKER_URL = 'http://reranker.internal:8090';

    // Happy sidecar rerank swaps order
    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        results: [
          { chunk_id: CHUNK_2, score: 0.99 },
          { chunk_id: CHUNK_1, score: 0.12 },
        ],
      }),
    }) as unknown as typeof fetch;
    const reranked = await reranker.rerank('query', hits, 2);
    expect(reranked[0].chunk_id).toBe(CHUNK_2);

    // Rejects hallucinated/unauthorized chunk_id from sidecar and falls back safely to pre-authorized hits!
    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        results: [
          { chunk_id: '99999999-9999-4999-8999-999999999999', score: 1.0 },
          { chunk_id: CHUNK_1, score: 0.5 },
        ],
      }),
    }) as unknown as typeof fetch;
    const fallback = await reranker.rerank('query', hits, 2);
    expect(fallback.map((h) => h.chunk_id)).toEqual([CHUNK_1, CHUNK_2]);

    // OllamaLlmGeneratorAdapter
    const generator = new OllamaLlmGeneratorAdapter();
    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ response: 'Grounded [1].', prompt_eval_count: 88, eval_count: 14 }),
    }) as unknown as typeof fetch;
    await expect(generator.generate('Prompt')).resolves.toEqual({
      response: 'Grounded [1].',
      inputTokens: 88,
      outputTokens: 14,
    });

    // Additional AI error & fallback branches
    globalThis.fetch = vi.fn().mockResolvedValueOnce({ ok: false, status: 502 }) as unknown as typeof fetch;
    await expect(embedder.embedQuery('fail')).rejects.toThrow(/HTTP 502/);

    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ bad: true }),
    }) as unknown as typeof fetch;
    await expect(embedder.embedQuery('fail')).rejects.toThrow(/Invalid embedding response/);

    globalThis.fetch = vi.fn().mockResolvedValueOnce({ ok: false, status: 500 }) as unknown as typeof fetch;
    await expect(reranker.rerank('query', hits, 2)).resolves.toEqual(hits);

    globalThis.fetch = vi.fn().mockRejectedValueOnce(new Error('timeout')) as unknown as typeof fetch;
    await expect(reranker.rerank('query', hits, 2)).resolves.toEqual(hits);

    globalThis.fetch = vi.fn().mockResolvedValueOnce({ ok: false, status: 503 }) as unknown as typeof fetch;
    await expect(generator.generate('Prompt')).rejects.toThrow(/503/);

    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ invalid: 1 }),
    }) as unknown as typeof fetch;
    await expect(generator.generate('Prompt', AbortSignal.timeout(5_000))).rejects.toThrow(
      /Invalid model response/,
    );
  });
});
