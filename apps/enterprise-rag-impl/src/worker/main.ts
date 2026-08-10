import { createHash } from 'node:crypto';
import { Pool } from 'pg';
import { env } from '../config/env';
import { MAX_UPLOAD_BYTES } from '../modules/uploads/const/uploads.const';
import { pinoLogger } from '../observability/logger.module';
import { workerJobsProcessed, workerMalwareBlocked } from '../observability/metrics';
import { promoteQuarantineObject, retrievePrivateObject } from '../storage/object-storage';
import { extractText, splitText } from './extract';
import { reapExpiredIngestionLeases } from './queue-runner';
import { MalwareDetectedError, scanClamav } from './scanner';
import { purgeOneDeletedObject } from './storage-gc';

const LEASE_SECONDS = 180;
const EMBED_BATCH_SIZE = 16;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

let workerPool: Pool | null = null;
function getWorkerPool(): Pool {
  if (!workerPool) {
    const url = process.env.WORKER_DATABASE_URL || env.WORKER_DATABASE_URL || env.DATABASE_URL;
    if (!url) {
      throw new Error('WORKER_DATABASE_URL required');
    }
    workerPool = new Pool({ connectionString: url, max: 5, idleTimeoutMillis: 15_000 });
  }
  return workerPool;
}

/** A lease token fences off workers whose lease was stolen after a crash or long stall. */
async function heartbeat(pool: Pool, jobId: string, leaseToken: string): Promise<boolean> {
  const result = await pool.query(
    `UPDATE ingestion_jobs
     SET lease_expires_at = now() + ($3::int * interval '1 second'),
         updated_at = now()
     WHERE id = $1 AND lease_token = $2::uuid AND status = 'processing' AND lease_expires_at > now()`,
    [jobId, leaseToken, LEASE_SECONDS],
  );
  return (result.rowCount ?? 0) > 0;
}

export async function embedChunksBatch(texts: string[]): Promise<Array<number[] | null>> {
  if (!env.EMBEDDINGS_ENABLED || texts.length === 0) {
    return texts.map(() => null);
  }
  const expectedDim = env.EMBEDDING_DIMENSIONS || 1024;
  const output: Array<number[] | null> = [];
  for (let i = 0; i < texts.length; i += EMBED_BATCH_SIZE) {
    const batch = texts.slice(i, i + EMBED_BATCH_SIZE);
    const response = await fetch(`${env.OLLAMA_URL}/api/embed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: env.OLLAMA_EMBED_MODEL, input: batch }),
      signal: AbortSignal.timeout(45_000),
    });
    if (!response.ok) {
      throw new Error(`Embeddings unavailable (${response.status})`);
    }
    const data = (await response.json()) as { embeddings?: unknown };
    if (!Array.isArray(data.embeddings) || data.embeddings.length !== batch.length) {
      throw new Error('Unexpected embedding batch size');
    }
    for (const vec of data.embeddings) {
      if (
        !Array.isArray(vec) ||
        vec.length !== expectedDim ||
        vec.some((x) => typeof x !== 'number' || !Number.isFinite(x))
      ) {
        throw new Error(`Unexpected embedding dimension (expected ${expectedDim})`);
      }
      output.push(vec as number[]);
    }
  }
  return output;
}

export async function processNextIngestionJob(jobId?: string, explicitPool?: Pool): Promise<boolean> {
  const pool = explicitPool ?? getWorkerPool();

  // Phase 1: Short atomic SQL transaction to reap expired exhausted jobs and claim one job.
  let claimed:
    | {
        id: string;
        document_id: string;
        leaseToken: string;
        attempts: number;
      }
    | undefined;

  const claimClient = await pool.connect();
  try {
    await claimClient.query('BEGIN');
    const exhausted = await claimClient.query<{ document_id: string }>(
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
      await claimClient.query(`UPDATE documents SET status = 'failed' WHERE id = $1 AND deleted_at IS NULL`, [
        failed.document_id,
      ]);
    }

    const row = await claimClient.query<{ id: string; document_id: string }>(
      `SELECT id, document_id FROM ingestion_jobs
       WHERE attempts < 3
         AND ($1::uuid IS NULL OR id = $1)
         AND ((status = 'pending' AND (next_attempt_at IS NULL OR next_attempt_at <= now()))
           OR (status = 'processing' AND lease_expires_at < now()))
       ORDER BY created_at FOR UPDATE SKIP LOCKED LIMIT 1`,
      [jobId ?? null],
    );
    if (!row.rowCount) {
      await claimClient.query('COMMIT');
      return false;
    }

    const { id, document_id } = row.rows[0];
    const lease = await claimClient.query<{ lease_token: string; attempts: number }>(
      `UPDATE ingestion_jobs
       SET status = 'processing',
           stage = 'scanning',
           attempts = attempts + 1,
           lease_token = gen_random_uuid(),
           lease_expires_at = now() + ($2::int * interval '1 second'),
           updated_at = now()
       WHERE id = $1
       RETURNING lease_token, attempts`,
      [id, LEASE_SECONDS],
    );
    await claimClient.query(
      "UPDATE documents SET status = 'processing' WHERE id = $1 AND deleted_at IS NULL",
      [document_id],
    );
    await claimClient.query('COMMIT');
    claimed = {
      id,
      document_id,
      leaseToken: lease.rows[0].lease_token,
      attempts: lease.rows[0].attempts,
    };
  } catch (err) {
    await claimClient.query('ROLLBACK').catch(() => {});
    pinoLogger.error({ errName: err instanceof Error ? err.name : 'UnknownError' }, 'Worker DB claim error');
    return false;
  } finally {
    // Release DB client BEFORE external ClamAV, OCR, PDF or Ollama network calls!
    claimClient.release();
  }

  let leaseLost = false;
  const stopHeartbeat = setInterval(() => {
    void heartbeat(pool, claimed.id, claimed.leaseToken)
      .then((ok) => {
        if (!ok) leaseLost = true;
      })
      .catch(() => {
        leaseLost = true;
      });
  }, 30_000);

  try {
    const docs = await pool.query<{
      id: string;
      tenant_id: string;
      owner_sub: string;
      body: string;
      file_path: string | null;
      original_filename: string | null;
      media_type: string | null;
      file_sha256: string | null;
      version: number;
      deleted_at: string | null;
    }>(
      `SELECT id, tenant_id, owner_sub, body, file_path, original_filename, media_type, file_sha256, version, deleted_at
       FROM documents WHERE id = $1`,
      [claimed.document_id],
    );
    if (!docs.rowCount || docs.rows[0].deleted_at) {
      throw new Error('Document unavailable');
    }

    const doc = docs.rows[0];
    let text = doc.body;
    let finalFilePath = doc.file_path;

    if (doc.file_path) {
      const data = await retrievePrivateObject(doc.file_path);
      if (data.length > MAX_UPLOAD_BYTES) {
        throw new Error('File too large');
      }
      const hash = createHash('sha256').update(data).digest('hex');
      if (hash !== doc.file_sha256) {
        throw new Error('File integrity mismatch');
      }
      if (env.CLAMAV_REQUIRED) {
        await scanClamav(data, env.CLAMAV_HOST, env.CLAMAV_PORT);
      }
      if (doc.file_path.startsWith('quarantine/')) {
        const cleanKey = `clean/${doc.file_path.slice('quarantine/'.length)}`;
        await promoteQuarantineObject(doc.file_path, cleanKey);
        finalFilePath = cleanKey;
      }
      await pool.query("UPDATE ingestion_jobs SET stage = 'extracting', updated_at = now() WHERE id = $1", [
        claimed.id,
      ]);
      text = await extractText(data, doc.original_filename ?? 'unknown');
    }

    const chunks = splitText(text, 900, 120);
    if (!chunks.length) {
      throw new Error('Empty extracted text');
    }
    await pool.query("UPDATE ingestion_jobs SET stage = 'embedding', updated_at = now() WHERE id = $1", [
      claimed.id,
    ]);
    const vectors = await embedChunksBatch(chunks);

    // Phase 3: Fenced atomic commit of chunks, document status, version record and idempotency marker.
    const commitClient = await pool.connect();
    try {
      await commitClient.query('BEGIN');
      if (leaseLost) {
        throw new Error('Lease heartbeat failed');
      }
      const owns = await commitClient.query(
        `SELECT 1 FROM ingestion_jobs
         WHERE id = $1 AND lease_token = $2::uuid AND status = 'processing' AND lease_expires_at > now()
         FOR UPDATE`,
        [claimed.id, claimed.leaseToken],
      );
      if (!owns.rowCount) {
        throw new Error('Worker lease is no longer held');
      }
      const still = await commitClient.query(
        'SELECT 1 FROM documents WHERE id = $1 AND version = $2 AND deleted_at IS NULL FOR UPDATE',
        [claimed.document_id, doc.version],
      );
      if (!still.rowCount) {
        throw new Error('Document was revoked or superseded while processing');
      }

      await commitClient.query('DELETE FROM document_chunks WHERE document_id = $1', [claimed.document_id]);
      for (const [ordinal, content] of chunks.entries()) {
        const vec = vectors[ordinal];
        await commitClient.query(
          `INSERT INTO document_chunks(tenant_id, document_id, ordinal, content, vector, embedding_model, document_version)
           VALUES($1, $2, $3, $4, $5::vector, $6, $7)`,
          [
            doc.tenant_id,
            claimed.document_id,
            ordinal,
            content,
            vec ? `[${vec.join(',')}]` : null,
            vec ? env.OLLAMA_EMBED_MODEL : null,
            doc.version,
          ],
        );
      }
      await commitClient.query('UPDATE documents SET body = $2, status = $3, file_path = $4 WHERE id = $1', [
        claimed.document_id,
        doc.file_path ? '' : text,
        'ready',
        finalFilePath,
      ]);
      await commitClient.query(
        `INSERT INTO document_versions(document_id, tenant_id, version, sha256, media_type, original_filename)
         VALUES($1, $2, $3, $4, $5, $6)
         ON CONFLICT(document_id, version) DO UPDATE
           SET sha256 = EXCLUDED.sha256,
               media_type = COALESCE(EXCLUDED.media_type, document_versions.media_type),
               original_filename = COALESCE(EXCLUDED.original_filename, document_versions.original_filename)`,
        [
          claimed.document_id,
          doc.tenant_id,
          doc.version,
          doc.file_sha256 ?? createHash('sha256').update(text, 'utf8').digest('hex'),
          doc.media_type ?? 'text/plain',
          doc.original_filename,
        ],
      );
      await commitClient.query(
        `INSERT INTO processed_events(event_key, topic)
         VALUES($1, 'ingestion.completed')
         ON CONFLICT (event_key) DO NOTHING`,
        [`doc:${claimed.document_id}:v${doc.version}:attempt:${claimed.attempts}`],
      );
      await commitClient.query(
        `UPDATE ingestion_jobs
         SET status = 'completed',
             stage = 'ready',
             error_message = NULL,
             completed_at = now(),
             updated_at = now(),
             lease_token = NULL,
             lease_expires_at = NULL
         WHERE id = $1 AND lease_token = $2::uuid`,
        [claimed.id, claimed.leaseToken],
      );
      await commitClient.query('COMMIT');
      workerJobsProcessed.inc({ outcome: 'completed' });
    } catch (commitErr) {
      await commitClient.query('ROLLBACK').catch(() => {});
      throw commitErr;
    } finally {
      commitClient.release();
    }
  } catch (error) {
    const isMalware = error instanceof MalwareDetectedError;
    const failClient = await pool.connect();
    try {
      await failClient.query('BEGIN');
      if (isMalware) {
        workerMalwareBlocked.inc();
        workerJobsProcessed.inc({ outcome: 'malware_blocked' });
        await failClient.query(
          `UPDATE ingestion_jobs
           SET status = 'failed',
               stage = 'failed',
               attempts = 3,
               error_message = 'Malware detected by ClamAV; quarantined object scheduled for purge',
               lease_token = NULL,
               lease_expires_at = NULL,
               updated_at = now()
           WHERE id = $1 AND lease_token = $2::uuid`,
          [claimed.id, claimed.leaseToken],
        );
        const blockedDoc = await failClient.query<{
          tenant_id: string;
          owner_sub: string;
          file_path: string | null;
        }>(
          `UPDATE documents
           SET status = 'failed'
           WHERE id = $1
           RETURNING tenant_id, owner_sub, file_path`,
          [claimed.document_id],
        );
        if (blockedDoc.rowCount) {
          const d = blockedDoc.rows[0];
          if (d.file_path) {
            await failClient.query(
              `INSERT INTO storage_deletions(document_id, object_key)
               VALUES($1, $2) ON CONFLICT(object_key) DO NOTHING`,
              [claimed.document_id, d.file_path],
            );
          }
          await failClient.query(
            `INSERT INTO audit_events(tenant_id, actor_sub, action, target_type, target_id)
             VALUES($1, $2, 'document.malware_blocked', 'document', $3)`,
            [d.tenant_id, d.owner_sub, claimed.document_id],
          );
        }
      } else {
        workerJobsProcessed.inc({ outcome: 'failed' });
        const safeErr =
          error instanceof Error ? error.message.replace(/[\r\n]+/g, ' ').slice(0, 180) : 'Processing failed';
        const updated = await failClient.query<{ attempts: number }>(
          `UPDATE ingestion_jobs
           SET status = CASE WHEN attempts >= 3 THEN 'failed' ELSE 'pending' END,
               stage = 'failed',
               error_message = $3,
               next_attempt_at = now() + (attempts * attempts * interval '20 seconds'),
               lease_token = NULL,
               lease_expires_at = NULL,
               updated_at = now()
           WHERE id = $1 AND lease_token = $2::uuid
           RETURNING attempts`,
          [claimed.id, claimed.leaseToken, safeErr],
        );
        if (updated.rowCount) {
          await failClient.query(
            `UPDATE documents
             SET status = CASE WHEN $2::int >= 3 THEN 'failed' ELSE 'queued' END
             WHERE id = $1 AND deleted_at IS NULL`,
            [claimed.document_id, updated.rows[0].attempts],
          );
        }
      }
      await failClient.query('COMMIT');
    } catch (failErr) {
      await failClient.query('ROLLBACK').catch(() => {});
      pinoLogger.error(
        {
          jobId: claimed.id,
          errName: failErr instanceof Error ? failErr.name : 'UnknownError',
          errMsg: failErr instanceof Error ? failErr.message.slice(0, 160) : 'Rollback',
        },
        'Worker failure-state persistence rolled back',
      );
    } finally {
      failClient.release();
    }
    pinoLogger.error(
      {
        jobId: claimed.id,
        documentId: claimed.document_id,
        malware: isMalware,
        errName: error instanceof Error ? error.name : 'UnknownError',
        errorMsg: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined,
      },
      'Ingestion job failed',
    );
  } finally {
    clearInterval(stopHeartbeat);
  }

  return true;
}

export const processOne = processNextIngestionJob;

async function main(): Promise<void> {
  let shutdown = false;
  process.on('SIGTERM', () => {
    shutdown = true;
  });
  process.on('SIGINT', () => {
    shutdown = true;
  });

  const pool = getWorkerPool();
  if (env.QUEUE_MODE === 'bullmq') {
    const { runIngestionQueue } = await import('./queue-runner');
    try {
      await runIngestionQueue({
        process: (id) => processNextIngestionJob(id, pool),
        isStopping: () => shutdown,
      });
    } finally {
      await pool.end();
    }
  } else {
    try {
      while (!shutdown) {
        await reapExpiredIngestionLeases(pool).catch(() => {});
        const handled = await processNextIngestionJob(undefined, pool);
        await purgeOneDeletedObject(pool).catch(() => {});
        if (!handled) {
          await sleep(2_000);
        }
      }
    } finally {
      await pool.end();
    }
  }
}

if (require.main === module) {
  main().catch((error) => {
    pinoLogger.error({ errName: error instanceof Error ? error.name : 'UnknownError' }, 'Worker stopped');
    process.exitCode = 1;
  });
}
