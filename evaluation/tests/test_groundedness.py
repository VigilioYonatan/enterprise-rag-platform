"""Unit tests for offline groundedness & retrieval evaluation."""
import unittest

from evaluation.runners.groundedness import aggregate_metrics, compute_case_metrics


class TestGroundednessEvaluator(unittest.TestCase):
    def test_positive_retrieval_perfect_match(self):
        result = compute_case_metrics(
            expected_doc_ids=["doc-a"],
            retrieved_doc_ids=["doc-a", "doc-b", "doc-c"],
            expected_abstention=False,
            actual_abstained=False,
            k=6,
        )
        self.assertEqual(result["recall_at_k"], 1.0)
        self.assertEqual(result["mrr_at_k"], 1.0)
        self.assertEqual(result["rank_of_first_match"], 1)

    def test_positive_retrieval_second_rank(self):
        result = compute_case_metrics(
            expected_doc_ids=["doc-a"],
            retrieved_doc_ids=["doc-b", "doc-a", "doc-c"],
            expected_abstention=False,
            actual_abstained=False,
            k=6,
        )
        self.assertEqual(result["recall_at_k"], 1.0)
        self.assertEqual(result["mrr_at_k"], 0.5)
        self.assertEqual(result["rank_of_first_match"], 2)

    def test_expected_abstention_success(self):
        result = compute_case_metrics(
            expected_doc_ids=[],
            retrieved_doc_ids=[],
            expected_abstention=True,
            actual_abstained=True,
            k=6,
        )
        self.assertTrue(result["abstention_pass"])

    def test_expected_abstention_failure_when_hallucinating(self):
        result = compute_case_metrics(
            expected_doc_ids=[],
            retrieved_doc_ids=["doc-unrelated"],
            expected_abstention=True,
            actual_abstained=False,
            k=6,
        )
        self.assertFalse(result["abstention_pass"])

    def test_aggregate_summary(self):
        c1 = compute_case_metrics(["a"], ["a"], False, False)
        c2 = compute_case_metrics(["b"], ["x", "b"], False, False)
        c3 = compute_case_metrics([], [], True, True)

        summary = aggregate_metrics([c1, c2, c3])
        self.assertEqual(summary["total_cases"], 3)
        self.assertEqual(summary["recall_at_6"], 1.0)
        self.assertEqual(summary["mrr_at_6"], 0.75)
        self.assertEqual(summary["abstention_pass_rate"], 1.0)


if __name__ == "__main__":
    unittest.main()
