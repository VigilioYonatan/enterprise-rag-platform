/** Deterministic offline retrieval metrics. Does not replace live authorized retrieval evaluations. */
export interface RetrievalCase {
  id: string;
  relevant: string[];
  ranked: string[];
}

export interface OfflineRetrievalMetrics {
  cases: number;
  recall_at_k: number;
  mrr_at_k: number;
  ndcg_at_k: number;
}

export type RetrievalMetrics = OfflineRetrievalMetrics;

export function evaluateOfflineRetrieval(cases: RetrievalCase[], k = 5): OfflineRetrievalMetrics {
  if (cases.length === 0 || !Number.isInteger(k) || k < 1) {
    throw new Error('Dataset and K must be valid');
  }
  const sums = cases.reduce(
    (accumulator, testCase) => {
      const relevance = new Set(testCase.relevant);
      const topCandidates = testCase.ranked.slice(0, k);
      const hits = topCandidates.filter((candidateId) => relevance.has(candidateId)).length;
      const firstHitIndex = topCandidates.findIndex((candidateId) => relevance.has(candidateId));
      const discountedCumulativeGain = topCandidates.reduce(
        (totalDcg, candidateId, index) =>
          totalDcg + (relevance.has(candidateId) ? 1 / Math.log2(index + 2) : 0),
        0,
      );
      const idealDiscountedCumulativeGain = Array.from(
        { length: Math.min(relevance.size, k) },
        (_, idealRankIndex) => 1 / Math.log2(idealRankIndex + 2),
      ).reduce((sum, value) => sum + value, 0);

      return {
        recall: accumulator.recall + (relevance.size ? hits / relevance.size : 1),
        mrr: accumulator.mrr + (firstHitIndex < 0 ? 0 : 1 / (firstHitIndex + 1)),
        ndcg:
          accumulator.ndcg +
          (idealDiscountedCumulativeGain ? discountedCumulativeGain / idealDiscountedCumulativeGain : 1),
      };
    },
    { recall: 0, mrr: 0, ndcg: 0 },
  );

  return {
    cases: cases.length,
    recall_at_k: sums.recall / cases.length,
    mrr_at_k: sums.mrr / cases.length,
    ndcg_at_k: sums.ndcg / cases.length,
  };
}

export const evaluateRetrieval = evaluateOfflineRetrieval;
