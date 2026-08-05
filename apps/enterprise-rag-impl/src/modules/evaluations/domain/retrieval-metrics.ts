/** Document-level deterministic metrics. Does not claim semantic faithfulness. */
export interface RetrievalMetrics {
  recall_at_6: number;
  mrr_at_6: number;
  ndcg_at_6: number;
  precision_at_6: number;
  rank_of_first_match: number | null;
  abstention_pass: boolean | null;
}
export function evaluateRetrieval(expected: string[], ranked: string[], abstain = false): RetrievalMetrics {
  if (!abstain && !expected.length) throw new Error('Non-empty ground truth required');
  if (abstain && expected.length) throw new Error('Abstention cases must not have expected documents');
  const expectedSet = new Set(expected);
  const docs = [...new Set(ranked)].slice(0, 6);
  if (abstain) {
    return {
      recall_at_6: docs.length ? 0 : 1,
      mrr_at_6: docs.length ? 0 : 1,
      ndcg_at_6: docs.length ? 0 : 1,
      precision_at_6: docs.length ? 0 : 1,
      rank_of_first_match: null,
      abstention_pass: !docs.length,
    };
  }
  const hits = docs.filter((doc) => expectedSet.has(doc));
  const first = docs.findIndex((doc) => expectedSet.has(doc));
  const dcg = docs.reduce((s, id, i) => s + (expectedSet.has(id) ? 1 / Math.log2(i + 2) : 0), 0);
  const ideal = Array.from({ length: Math.min(expectedSet.size, 6) }, (_, i) => 1 / Math.log2(i + 2)).reduce(
    (a, b) => a + b,
    0,
  );
  return {
    recall_at_6: hits.length / expectedSet.size,
    mrr_at_6: first < 0 ? 0 : 1 / (first + 1),
    ndcg_at_6: ideal ? dcg / ideal : 0,
    precision_at_6: hits.length / 6,
    rank_of_first_match: first < 0 ? null : first + 1,
    abstention_pass: null,
  };
}
