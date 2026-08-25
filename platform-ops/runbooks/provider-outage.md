# Incident runbook: local LLM provider unavailable

1. Verify internal Ollama endpoint and installed model names, without logging question text.
2. The answer route must abstain with a provider-unavailable message and no fabricated citations.
3. Ensure tenant budgets and request logs remain bounded under repeated failure.
4. Resume model container/service only after checking memory/disk availability and timeouts.
5. Run a synthetic authorized retrieval and answer; verify citations resolve under current ACL.
