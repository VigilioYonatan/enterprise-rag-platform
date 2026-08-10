import { Queue, Worker } from 'bullmq';
import { Pool } from 'pg';
import { env } from '../config/env';
import { pinoLogger } from '../observability/logger.module';
import { purgeOneDeletedObject } from './storage-gc';

export async function reapExpiredIngestionLeases(db: Pool): Promise<number> {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const exhausted = await client.query<{ document_id: string }>(
      `UPDATE ingestion_jobs
       SET status = 'failed',
           stage = 'failed',
           error_message = 'Worker lease expired after max attempts',
           lease_token = NULL,
           lease_expires_at = NULL,
           updated_at = now()
       WHERE status = 'processing' AND lease_expires_at < now() AND attempts >= 3
       RETURNING document_id`,
    );
    for (const failed of exhausted.rows) {
      await client.query(`UPDATE documents SET status = 'failed' WHERE id = $1 AND deleted_at IS NULL`, [
        failed.document_id,
      ]);
    }
    await client.query('COMMIT');
    return exhausted.rowCount ?? 0;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Valkey transports work; PostgreSQL is authoritative for ownership, leases and retries.
 * Valkey outages delay dispatch rather than losing already committed document requests.
 */
export async function runIngestionQueue(deps: {
  process: (jobId: string) => Promise<boolean>;
  isStopping: () => boolean;
}): Promise<void> {
  const u = new URL(env.VALKEY_URL);
  const connection = {
    host: u.hostname,
    port: Number(u.port || 6379),
    password: env.VALKEY_PASSWORD || undefined,
    maxRetriesPerRequest: null,
  };
  const queue = new Queue('rag-ingestion', {
    connection,
    defaultJobOptions: { removeOnComplete: true, removeOnFail: true, attempts: 1 },
  });
  const db = new Pool({ connectionString: process.env.WORKER_DATABASE_URL || env.DATABASE_URL, max: 2 });
  const worker = new Worker(
    'rag-ingestion',
    async (job) => {
      const handled = await deps.process(String(job.data.job_id));
      if (!handled) {
        throw new Error('Job unavailable or already claimed');
      }
      return { accepted: true };
    },
    { connection, concurrency: 2 },
  );
  worker.on('error', (error) => pinoLogger.error({ errName: error.name }, 'BullMQ worker error'));

  async function dispatchFallback(): Promise<void> {
    await reapExpiredIngestionLeases(db);
    const jobs = await db.query<{ id: string; attempts: number }>(
      `SELECT id, attempts FROM ingestion_jobs
       WHERE attempts < 3
         AND ((status = 'pending' AND (next_attempt_at IS NULL OR next_attempt_at <= now()))
           OR (status = 'processing' AND lease_expires_at < now()))
       ORDER BY created_at LIMIT 100`,
    );
    for (const job of jobs.rows) {
      // Unique per SQL attempt. Multiple dispatchers or outbox relays cannot duplicate a completed attempt.
      const key = `ingest-${job.id}-${job.attempts + 1}`;
      await queue.add('ingest', { job_id: job.id }, { jobId: key });
    }
  }

  try {
    while (!deps.isStopping()) {
      try {
        await dispatchFallback();
        await purgeOneDeletedObject(db);
      } catch (error) {
        pinoLogger.warn(
          { errName: error instanceof Error ? error.name : 'Error' },
          'Queue fallback dispatch cycle warning',
        );
      }
      await new Promise((resolve) => setTimeout(resolve, 3_000));
    }
  } finally {
    await worker.close();
    await queue.close();
    await db.end();
  }
}
