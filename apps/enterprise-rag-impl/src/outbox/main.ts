import { Queue } from 'bullmq';
import { Pool } from 'pg';
import { env } from '../config/env';
import { pinoLogger } from '../observability/logger.module';
import { outboxEventsDispatched } from '../observability/metrics';
import { reapExpiredIngestionLeases } from '../worker/queue-runner';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export interface OutboxRecord {
  id: string;
  tenant_id: string;
  topic: string;
  aggregate_id: string;
  payload: Record<string, unknown>;
  attempts: number;
}

export async function relayOutboxBatch(pool: Pool, queue: Queue | null, batchSize = 50): Promise<number> {
  const client = await pool.connect();
  let claimed: OutboxRecord[] = [];
  try {
    await client.query('BEGIN');
    const rows = await client.query<OutboxRecord>(
      `SELECT id, tenant_id, topic, aggregate_id, payload, attempts
       FROM outbox_events
       WHERE attempts < 10
         AND ((status = 'pending' AND next_attempt_at <= now())
           OR (status = 'processing' AND lease_expires_at < now()))
       ORDER BY created_at ASC
       FOR UPDATE SKIP LOCKED
       LIMIT $1`,
      [batchSize],
    );
    if (!rows.rowCount) {
      await client.query('COMMIT');
      return 0;
    }
    const ids = rows.rows.map((r) => r.id);
    await client.query(
      `UPDATE outbox_events
       SET status = 'processing',
           attempts = attempts + 1,
           lease_expires_at = now() + interval '60 seconds'
       WHERE id = ANY($1::uuid[])`,
      [ids],
    );
    await client.query('COMMIT');
    claimed = rows.rows;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }

  let published = 0;
  for (const event of claimed) {
    try {
      if (queue && event.topic === 'document.ingestion.requested') {
        const jobId = typeof event.payload.job_id === 'string' ? event.payload.job_id : event.aggregate_id;
        await queue.add('ingest', { job_id: jobId }, { jobId: `outbox-${event.id}` });
      }
      await pool.query(
        `UPDATE outbox_events
         SET status = 'dispatched',
             dispatched_at = now(),
             lease_expires_at = NULL,
             last_error = NULL
         WHERE id = $1`,
        [event.id],
      );
      outboxEventsDispatched.inc({ event_type: event.topic, outcome: 'published' });
      published++;
    } catch (err) {
      const msg = err instanceof Error ? err.message.slice(0, 200) : 'Outbox publish error';
      await pool
        .query(
          `UPDATE outbox_events
           SET status = CASE WHEN attempts >= 10 THEN 'failed' ELSE 'pending' END,
               last_error = $2,
               lease_expires_at = NULL,
               next_attempt_at = now() + (LEAST(attempts * attempts, 600) * interval '5 seconds')
           WHERE id = $1`,
          [event.id, msg],
        )
        .catch(() => {});
      outboxEventsDispatched.inc({ event_type: event.topic, outcome: 'failed' });
    }
  }
  return published;
}

async function main(): Promise<void> {
  const dbUrl = process.env.WORKER_DATABASE_URL || env.WORKER_DATABASE_URL || env.DATABASE_URL;
  const pool = new Pool({ connectionString: dbUrl, max: 3, idleTimeoutMillis: 15_000 });

  let queue: Queue | null = null;
  if (env.QUEUE_MODE === 'bullmq') {
    const u = new URL(env.VALKEY_URL);
    queue = new Queue('rag-ingestion', {
      connection: {
        host: u.hostname,
        port: Number(u.port || 6379),
        password: env.VALKEY_PASSWORD || undefined,
        maxRetriesPerRequest: null,
      },
      defaultJobOptions: { removeOnComplete: true, removeOnFail: true, attempts: 1 },
    });
  }

  let stopping = false;
  process.on('SIGTERM', () => {
    stopping = true;
  });
  process.on('SIGINT', () => {
    stopping = true;
  });

  pinoLogger.info({ queueMode: env.QUEUE_MODE }, 'Outbox relay started');
  try {
    while (!stopping) {
      try {
        await reapExpiredIngestionLeases(pool);
        const relayed = await relayOutboxBatch(pool, queue);
        if (relayed === 0) {
          await sleep(2_000);
        }
      } catch (err) {
        pinoLogger.warn({ errName: err instanceof Error ? err.name : 'Error' }, 'Outbox cycle warning');
        await sleep(3_000);
      }
    }
  } finally {
    if (queue) {
      await queue.close();
    }
    await pool.end();
  }
}

if (require.main === module) {
  main().catch((err) => {
    pinoLogger.error({ errName: err instanceof Error ? err.name : 'UnknownError' }, 'Outbox relay failed');
    process.exitCode = 1;
  });
}
