# Incident runbook: ingestion backlog

Observe `ingestion_jobs` statuses, `next_attempt_at`, attempts, ClamAV health and worker CPU/memory.
A failed antivirus scan is not permission to disable scanning. Verify scanner signature updates, inspect rejected media via quarantined process, then retry authorized jobs.
Scale worker replicas on the same Compose host only after measuring PostgreSQL locks and Ollama capacity. PostgreSQL `SKIP LOCKED` prevents two workers claiming the same pending job.
Avoid moving files without database transaction coordination. Confirm ingestion status changes, chunk counts, failed jobs and user-facing UI; record timestamps and recovery duration.
