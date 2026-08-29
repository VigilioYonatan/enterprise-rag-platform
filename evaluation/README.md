# Offline Evaluation Suite — Groundedness, Retrieval & Abstention

This directory provides self-contained, offline evaluation tools to measure RAG quality without leaking data or requiring live LLM cloud calls during CI.

## Datasets
- `datasets/synthetic-sample.jsonl`: Baseline evaluation dataset with known context, citations, and expected abstention cases.
- `datasets/groundedness-synthetic.jsonl`: Synthetic multi-case benchmark testing ACL boundary compliance and abstention.

## Runner & Tests
- `runners/groundedness.py`: Calculates Recall@6, MRR@6, nDCG@6, citation precision, and abstention correctness.
- `tests/test_groundedness.py`: Deterministic unit tests for the offline evaluation runner.

Run unit tests:
```bash
python -m unittest discover -s evaluation/tests -p "test_*.py"
```
