# PostgreSQL restore drill (production gate)

Do not restore over a live production DB. Use separate host, encrypted backup, documented WAL archive. Restore snapshot to isolated PostgreSQL, replay to selected timestamp, test RLS with non-owner, reconcile object references. Measure RTO/RPO. This scaffold does NOT install pgBackRest; restore is BLOCKED until infrastructure and credentials exist.
