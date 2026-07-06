import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Client } from 'pg';
import pino from 'pino';

const logger = pino({
  name: 'rag-migrator',
  level: process.env.LOG_LEVEL ?? 'info',
  redact: ['DATABASE_URL', 'MIGRATION_DATABASE_URL'],
});

/** Only the one-shot migration role owns DDL. Each file is committed atomically and tracked. */
async function main(): Promise<void> {
  const url = process.env.MIGRATION_DATABASE_URL;
  if (!url) {
    throw new Error('MIGRATION_DATABASE_URL required');
  }
  const db = new Client({ connectionString: url });
  await db.connect();
  try {
    await db.query('SELECT pg_advisory_lock(14072026)');
    await db.query(
      'CREATE TABLE IF NOT EXISTS schema_migrations (filename text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())',
    );
    await db.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'rag_app') THEN
          GRANT SELECT ON TABLE schema_migrations TO rag_app;
        END IF;
      END $$;
    `);
    const dir = join(__dirname, 'migrations');
    const files = readdirSync(dir)
      .filter((filename) => /^\d+_[a-z0-9_]+\.sql$/.test(filename))
      .sort();
    for (const filename of files) {
      const existing = await db.query('SELECT 1 FROM schema_migrations WHERE filename = $1', [filename]);
      if (existing.rowCount) {
        continue;
      }
      await db.query('BEGIN');
      try {
        await db.query(readFileSync(join(dir, filename), 'utf8'));
        await db.query('INSERT INTO schema_migrations(filename) VALUES($1)', [filename]);
        await db.query('COMMIT');
        logger.info({ migration: filename }, 'Applied SQL migration');
      } catch (error) {
        await db.query('ROLLBACK');
        throw error;
      }
    }
  } finally {
    await db.query('SELECT pg_advisory_unlock(14072026)').catch(() => {});
    await db.end();
  }
}

main().catch((error: unknown) => {
  logger.error({ err: error }, 'Migration failed');
  process.exitCode = 1;
});
