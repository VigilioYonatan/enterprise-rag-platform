#!/usr/bin/env python3
"""Execute full automated test gates and compile V6_TEST_EVIDENCE.json."""
import json
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

root = Path(__file__).resolve().parent.parent

checks_to_run = [
    ("python checks/source-audit.py", "source structural audit"),
    ("python checks/v3-invariants.py", "v3/v6 database and security invariants"),
    ("python checks/v5-hardening-tests.py", "v5/v6 hardening and rootless compose"),
    ("python checks/v6-release-gates.py", "v6 release gates and contract sync"),
    ("python checks/dependency-contract-audit.py", "declared dependency audit"),
    ("node checks/typescript-syntax.cjs", "TypeScript AST syntax validation"),
    ("node checks/architecture-regression.cjs", "repository boundary regressions"),
    ("node checks/runtime-pure-tests.cjs", "pure business logic invariants"),
    ("node checks/v3-runtime-pure.cjs", "pure SSE and metric evaluations"),
    ("node checks/v4-citation-tests.cjs", "citation parsing and quality invariants"),
    ("node prod-local/scripts/bdd-runner.mjs", "Gherkin BDD scenario invariants"),
    ("python -m unittest discover -s evaluation/tests -p \"test_*.py\"", "offline evaluation suite"),
    ("python checks/per-file-audit.py", "per-file structural catalog"),
]

evidence = {
    "generated_at_utc": datetime.now(timezone.utc).isoformat(),
    "suite": "Enterprise RAG Platform v6 Delivery Verification",
    "total_checks": len(checks_to_run),
    "passed_checks": 0,
    "failed_checks": 0,
    "results": [],
}

all_ok = True

print("=== STARTING FULL DELIVERY VERIFICATION SUITE ===")
for cmd, desc in checks_to_run:
    print(f"\n[RUNNING] {cmd} ({desc})...")
    res = subprocess.run(cmd, cwd=root, shell=True, capture_output=True, text=True)
    status = "PASS" if res.returncode == 0 else "FAIL"
    if res.returncode != 0:
        all_ok = False
        evidence["failed_checks"] += 1
    else:
        evidence["passed_checks"] += 1

    entry = {
        "command": cmd,
        "description": desc,
        "status": status,
        "exit_code": res.returncode,
        "stdout_snippet": res.stdout.strip()[:500],
        "stderr_snippet": res.stderr.strip()[:500],
    }
    evidence["results"].append(entry)
    print(f"[{status}] (exit code {res.returncode}): {entry['stdout_snippet']}")

evidence_file = root / "checks/V6_TEST_EVIDENCE.json"
evidence_file.write_text(json.dumps(evidence, indent=2), encoding="utf-8")
print(f"\nTest evidence written to: {evidence_file}")

if not all_ok:
    print("\nOne or more checks FAILED.", file=sys.stderr)
    sys.exit(1)
else:
    print(f"\nAll {len(checks_to_run)} delivery checks PASSED successfully.")
