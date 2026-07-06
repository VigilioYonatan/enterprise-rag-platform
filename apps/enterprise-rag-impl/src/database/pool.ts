import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool, type PoolClient } from 'pg';
import { env } from '../config/env';
import * as schema from './schema';

export type DrizzleDb = NodePgDatabase<typeof schema>;

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: 16,
  idleTimeoutMillis: 10_000,
  connectionTimeoutMillis: 5_000,
});

/**
 * Executes all queries in a bounded transaction with actor-local RLS context (`app.actor_sub`)
 * and pgvector iterative scan enabled so filtered HNSW queries preserve recall on small KBs.
 * Injects typed Drizzle ORM instance bound to the active RLS transaction client.
 */
export async function withActor<T>(
  actor_sub: string,
  fn: (db: DrizzleDb, client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SET LOCAL statement_timeout = 30000');
    await client.query("SET LOCAL hnsw.iterative_scan = 'relaxed_order'").catch(() => {});
    await client.query("SELECT set_config('app.actor_sub', $1, true)", [actor_sub]);
    const orm = drizzle(client, { schema });
    const result = await fn(orm, client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

let pool_closed = false;
export async function closePool(): Promise<void> {
  if (pool_closed) {
    return;
  }
  pool_closed = true;
  await pool.end();
}
