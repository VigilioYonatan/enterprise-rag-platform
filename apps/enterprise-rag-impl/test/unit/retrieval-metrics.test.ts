import { describe, expect, it } from 'vitest';
import { evaluateRetrieval } from '../../src/modules/evaluations/domain/retrieval-metrics';

describe('Retrieval metrics', () => {
  it('scores exact hits and bounds nDCG', () => {
    const score = evaluateRetrieval(['a'], ['a']);
    expect(score).toMatchObject({
      recall_at_6: 1,
      mrr_at_6: 1,
      ndcg_at_6: 1,
      rank_of_first_match: 1,
      abstention_pass: null,
    });
    expect(score.precision_at_6).toBeCloseTo(1 / 6);
  });
  it('deduplicates repeated documents', () =>
    expect(evaluateRetrieval(['a', 'b'], ['a', 'a', 'b']).recall_at_6).toBe(1));
  it('scores missing results zero', () => expect(evaluateRetrieval(['a'], ['x', 'y']).mrr_at_6).toBe(0));
  it('evaluates expected abstention', () => {
    expect(evaluateRetrieval([], [], true).abstention_pass).toBe(true);
    expect(evaluateRetrieval([], ['x'], true).abstention_pass).toBe(false);
  });
  it('rejects missing positive ground truth', () => expect(() => evaluateRetrieval([], ['a'])).toThrow());
  it('rejects irrelevant ground truth in abstention cases', () =>
    expect(() => evaluateRetrieval(['a'], [], true)).toThrow());
});
