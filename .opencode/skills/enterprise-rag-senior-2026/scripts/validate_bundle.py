#!/usr/bin/env python3
"""Validate the integrity and completeness of the Enterprise RAG bundle."""
import sys
from pathlib import Path

root = Path(__file__).resolve().parents[4]

def validate():
    required_dirs = [
        root / "apps/enterprise-rag-impl",
        root / "apps/enterprise-rag-web",
        root / "enterprise-rag-deploy",
        root / "platform-ops",
        root / "prod-local",
    ]
    for d in required_dirs:
        if not d.is_dir():
            print(f"Missing required logical repository: {d}", file=sys.stderr)
            sys.exit(1)
    print("Bundle structure validated: 5 logical repositories present.")

if __name__ == "__main__":
    validate()
