import { describe, expect, it, vi } from 'vitest';
import type {
  ComputedCaseMetric,
  EvaluationsRepositoryPort,
} from '../../src/modules/evaluations/application/ports/evaluations-repository.port';
import {
  EvaluationsService,
  summarizeEvaluationRunMetrics,
} from '../../src/modules/evaluations/application/services/evaluations.service';
import type { RetrievalService } from '../../src/modules/knowledge/application/services/retrieval.service';

describe('EvaluationsService application layer', () => {
  it('summarizes metrics correctly with mixed positive and negative samples', () => {
    const samples: ComputedCaseMetric[] = [
      {
        case_id: 'c1',
        docs: ['d1'],
        expected_abstention: false,
        recall_at_6: 1.0,
        mrr_at_6: 1.0,
        ndcg_at_6: 1.0,
        precision_at_6: 0.5,
        rank_of_first_match: 1,
        abstention_pass: null,
      },
      {
        case_id: 'c2',
        docs: ['d2'],
        expected_abstention: false,
        recall_at_6: 0.5,
        mrr_at_6: 0.5,
        ndcg_at_6: 0.5,
        precision_at_6: 0.25,
        rank_of_first_match: 2,
        abstention_pass: null,
      },
      {
        case_id: 'c3',
        docs: [],
        expected_abstention: true,
        recall_at_6: 0,
        mrr_at_6: 0,
        ndcg_at_6: 0,
        precision_at_6: 0,
        rank_of_first_match: null,
        abstention_pass: true,
      },
      {
        case_id: 'c4',
        docs: ['d-leak'],
        expected_abstention: true,
        recall_at_6: 0,
        mrr_at_6: 0,
        ndcg_at_6: 0,
        precision_at_6: 0,
        rank_of_first_match: null,
        abstention_pass: false,
      },
    ];

    const summary = summarizeEvaluationRunMetrics(samples);
    expect(summary.recall).toBeCloseTo(0.75);
    expect(summary.mrr).toBeCloseTo(0.75);
    expect(summary.ndcg).toBeCloseTo(0.75);
    expect(summary.precision).toBeCloseTo(0.375);
    expect(summary.abstention).toBe(0.5);
  });

  it('delegates dataset and case management CRUD methods to repository', async () => {
    const repo: EvaluationsRepositoryPort = {
      datasets: vi.fn().mockResolvedValue({ count: 1, rows: [{ id: 'ds1', name: 'DS' }] }),
      createDataset: vi.fn().mockResolvedValue({ id: 'ds1', name: 'DS' }),
      deleteDataset: vi.fn().mockResolvedValue({ id: 'ds1', deleted: true }),
      cases: vi.fn().mockResolvedValue({ count: 1, rows: [{ id: 'case1' }] }),
      addCase: vi.fn().mockResolvedValue({ id: 'case1' }),
      deleteCase: vi.fn().mockResolvedValue({ id: 'case1', deleted: true }),
      runs: vi.fn().mockResolvedValue({ count: 1, rows: [{ id: 'run1' }] }),
      getRun: vi.fn().mockResolvedValue({ id: 'run1' }),
      startRun: vi.fn(),
      completeRun: vi.fn(),
      failRun: vi.fn(),
    };

    const retrieval = {} as RetrievalService;
    const service = new EvaluationsService(retrieval, repo);

    const dsList = await service.datasets('user-1', 'tenant-1');
    expect(dsList.count).toBe(1);

    const dsCreated = await service.createDataset('user-1', 'tenant-1', 'kb-1', 'New DS');
    expect(dsCreated.id).toBe('ds1');

    const dsDeleted = await service.deleteDataset('user-1', 'ds1');
    expect(dsDeleted.deleted).toBe(true);

    const caseList = await service.cases('user-1', 'ds1');
    expect(caseList.count).toBe(1);

    const caseAdded = await service.addCase('user-1', 'ds1', 'Question?', ['d1'], false);
    expect(caseAdded.id).toBe('case1');

    const caseDeleted = await service.deleteCase('user-1', 'ds1', 'case1');
    expect(caseDeleted.deleted).toBe(true);

    const runList = await service.runs('user-1', 'tenant-1');
    expect(runList.count).toBe(1);

    const runDetail = await service.getRun('user-1', 'run1');
    expect(runDetail.id).toBe('run1');
  });

  it('executes evaluation run across cases and records results, failing on unexpected error', async () => {
    const repo: EvaluationsRepositoryPort = {
      datasets: vi.fn(),
      createDataset: vi.fn(),
      deleteDataset: vi.fn(),
      cases: vi.fn(),
      addCase: vi.fn(),
      deleteCase: vi.fn(),
      runs: vi.fn(),
      getRun: vi.fn(),
      startRun: vi.fn().mockResolvedValue({
        tenant_id: 't1',
        kb: 'kb1',
        run_id: 'run-123',
        cases: [
          {
            id: 'case-1',
            question: 'What is RAG?',
            expected_document_ids: ['doc-1'],
            expected_abstention: false,
          },
        ],
      }),
      completeRun: vi.fn().mockResolvedValue({
        id: 'run-123',
        status: 'completed',
        recall: 1.0,
        mrr: 1.0,
      }),
      failRun: vi.fn().mockResolvedValue(undefined),
    };

    const retrieval = {
      search: vi.fn().mockResolvedValue([
        {
          chunk_id: 'ch1',
          document_id: 'doc-1',
          document_version: 1,
          title: 'RAG Guide',
          content: 'RAG is Retrieval-Augmented Generation',
          score: 0.95,
        },
      ]),
    } as unknown as RetrievalService;

    const service = new EvaluationsService(retrieval, repo);
    const result = await service.run('user-1', 'ds1');
    expect(result.status).toBe('completed');
    expect(retrieval.search).toHaveBeenCalledWith('user-1', 'kb1', 'What is RAG?');
    expect(repo.completeRun).toHaveBeenCalled();

    // Verify error branch triggers failRun
    vi.mocked(retrieval.search).mockRejectedValueOnce(new Error('Retrieval timed out'));
    await expect(service.run('user-1', 'ds1')).rejects.toThrow('Retrieval timed out');
    expect(repo.failRun).toHaveBeenCalledWith('user-1', 'run-123');
  });
});
