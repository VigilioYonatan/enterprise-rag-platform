"""Offline Groundedness & Retrieval Evaluator.

Computes Recall@K, MRR@K, nDCG@K, Precision@K and Abstention Pass Rate.
"""
from __future__ import annotations

import math
from typing import Sequence


def compute_case_metrics(
    expected_doc_ids: Sequence[str],
    retrieved_doc_ids: Sequence[str],
    expected_abstention: bool,
    actual_abstained: bool,
    k: int = 6,
) -> dict[str, float | bool | int | None]:
    top_k = list(retrieved_doc_ids[:k])

    if expected_abstention:
        return {
            "expected_abstention": True,
            "actual_abstained": actual_abstained,
            "abstention_pass": actual_abstained and len(top_k) == 0,
            "recall_at_k": 0.0 if top_k else 1.0,
            "mrr_at_k": 0.0,
            "ndcg_at_k": 0.0,
            "precision_at_k": 0.0,
            "rank_of_first_match": None,
        }

    expected_set = set(expected_doc_ids)
    if not expected_set:
        return {
            "expected_abstention": False,
            "actual_abstained": actual_abstained,
            "abstention_pass": None,
            "recall_at_k": 0.0,
            "mrr_at_k": 0.0,
            "ndcg_at_k": 0.0,
            "precision_at_k": 0.0,
            "rank_of_first_match": None,
        }

    hits = [doc_id for doc_id in top_k if doc_id in expected_set]
    first_rank: int | None = None
    for idx, doc_id in enumerate(top_k, start=1):
        if doc_id in expected_set:
            first_rank = idx
            break

    recall = len(set(hits)) / len(expected_set)
    precision = len(hits) / max(len(top_k), 1)
    mrr = (1.0 / first_rank) if first_rank is not None else 0.0

    dcg = sum(1.0 / math.log2(rank + 1) for rank, doc_id in enumerate(top_k, start=1) if doc_id in expected_set)
    ideal_count = min(len(expected_set), k)
    idcg = sum(1.0 / math.log2(rank + 1) for rank in range(1, ideal_count + 1))
    ndcg = (dcg / idcg) if idcg > 0.0 else 0.0

    return {
        "expected_abstention": False,
        "actual_abstained": actual_abstained,
        "abstention_pass": False if actual_abstained else None,
        "recall_at_k": round(recall, 4),
        "mrr_at_k": round(mrr, 4),
        "ndcg_at_k": round(ndcg, 4),
        "precision_at_k": round(precision, 4),
        "rank_of_first_match": first_rank,
    }


def aggregate_metrics(case_results: Sequence[dict]) -> dict[str, float | None]:
    positives = [r for r in case_results if not r.get("expected_abstention")]
    negatives = [r for r in case_results if r.get("expected_abstention")]

    def avg(lst: Sequence[dict], key: str) -> float | None:
        if not lst:
            return None
        return round(sum(float(item[key]) for item in lst) / len(lst), 4)

    abstention_rate = None
    if negatives:
        abstention_rate = round(
            sum(1 for item in negatives if item.get("abstention_pass") is True) / len(negatives),
            4,
        )

    return {
        "recall_at_6": avg(positives, "recall_at_k"),
        "mrr_at_6": avg(positives, "mrr_at_k"),
        "ndcg_at_6": avg(positives, "ndcg_at_k"),
        "precision_at_6": avg(positives, "precision_at_k"),
        "abstention_pass_rate": abstention_rate,
        "total_cases": len(case_results),
    }
