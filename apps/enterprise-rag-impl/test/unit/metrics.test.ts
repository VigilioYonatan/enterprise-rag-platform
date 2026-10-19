import { describe, expect, it } from 'vitest';
import { evaluateOfflineRetrieval } from '../../src/evaluation/metrics';

describe('Retrieval baseline metrics', () => {
  it('computes perfect top-one metrics', () => {
    expect(evaluateOfflineRetrieval([{ id: 'a', relevant: ['docA'], ranked: ['docA'] }], 1)).toEqual({
      cases: 1,
      recall_at_k: 1,
      mrr_at_k: 1,
      ndcg_at_k: 1,
    });
  });

  it('returns zero for missing relevant documents', () => {
    const result = evaluateOfflineRetrieval([{ id: 'a', relevant: ['docA'], ranked: ['docB'] }], 1);
    expect(result.recall_at_k).toBe(0);
    expect(result.mrr_at_k).toBe(0);
    expect(result.ndcg_at_k).toBe(0);
  });

  it('rejects empty datasets', () => {
    expect(() => evaluateOfflineRetrieval([])).toThrow();
  });
});
