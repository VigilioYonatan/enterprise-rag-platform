import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const url = process.env.MIGRATION_DATABASE_URL;
if (!url) {
  console.error('MIGRATION_DATABASE_URL is required to initialize database.');
  process.exit(1);
}

const appPassword = process.env.APP_DB_PASSWORD;
const workerPassword = process.env.WORKER_DB_PASSWORD;
if (!appPassword || !workerPassword) {
  console.error('APP_DB_PASSWORD and WORKER_DB_PASSWORD environment variables are required.');
  process.exit(1);
}

const client = new Client({ connectionString: url });
await client.connect();

try {
  await client.query('CREATE EXTENSION IF NOT EXISTS vector;');
  await client.query('BEGIN');
  try {
    await client.query('SELECT set_config($1, $2, true), set_config($3, $4, true)', [
      'app.init_app_pw',
      appPassword,
      'app.init_worker_pw',
      workerPassword,
    ]);
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'rag_app') THEN
          EXECUTE format('CREATE ROLE rag_app LOGIN PASSWORD %L', current_setting('app.init_app_pw'));
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'rag_worker') THEN
          EXECUTE format('CREATE ROLE rag_worker LOGIN PASSWORD %L', current_setting('app.init_worker_pw'));
        END IF;
      END $$;
    `);
    await client.query('COMMIT');
  } catch (roleErr) {
    await client.query('ROLLBACK');
    throw roleErr;
  }

  const dbNameRes = await client.query('SELECT current_database() AS dbname');
  const dbName = dbNameRes.rows[0]?.dbname ?? 'rag';
  await client.query(`GRANT CONNECT ON DATABASE "${dbName}" TO rag_app, rag_worker;`);
  await client.query('GRANT USAGE ON SCHEMA public TO rag_app, rag_worker;');

  await client.query(
    'CREATE TABLE IF NOT EXISTS schema_migrations (filename text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())',
  );
  await client.query('GRANT SELECT ON TABLE schema_migrations TO rag_app;');

  const migrationsDir = path.join(__dirname, '../src/database/migrations');
  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => /^\d+_[a-z0-9_]+\.sql$/.test(f))
    .sort();

  for (const f of files) {
    const check = await client.query('SELECT 1 FROM schema_migrations WHERE filename = $1', [f]);
    if (check.rowCount && check.rowCount > 0) {
      continue;
    }
    const sql = fs.readFileSync(path.join(migrationsDir, f), 'utf-8');
    await client.query('BEGIN');
    try {
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations(filename) VALUES($1)', [f]);
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      console.error(`Migration ${f} failed:`, err);
      throw err;
    }
  }

  console.log('Database initialized with least-privilege roles and all migrations applied.');
} finally {
  await client.end();
}
