import type { Pool } from 'pg';
import { pinoLogger } from '../observability/logger.module';
import { removePrivateObject } from '../storage/object-storage';

/** Bounded erasure worker: PostgreSQL lease prevents double commit; object DELETE is idempotent. */
export async function purgeOneDeletedObject(pool: Pool): Promise<boolean> {
  const db = await pool.connect();
  let id: string | undefined;
  let key: string | undefined;
  try {
    await db.query('BEGIN');
    const found = await db.query<{ id: string; object_key: string }>(
      `SELECT id, object_key FROM storage_deletions
       WHERE attempts < 10
         AND ((status = 'pending' AND next_attempt_at <= now())
           OR (status = 'processing' AND lease_expires_at < now()))
       ORDER BY next_attempt_at FOR UPDATE SKIP LOCKED LIMIT 1`,
    );
    if (!found.rowCount) {
      await db.query('COMMIT');
      return false;
    }
    id = found.rows[0].id;
    key = found.rows[0].object_key;
    await db.query(
      `UPDATE storage_deletions
       SET status = 'processing',
           attempts = attempts + 1,
           lease_expires_at = now() + interval '90 seconds',
           updated_at = now()
       WHERE id = $1`,
      [id],
    );
    await db.query('COMMIT');
  } catch (err) {
    await db.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    db.release();
  }

  try {
    await removePrivateObject(key);
    const c = await pool.connect();
    try {
      await c.query('BEGIN');
      const changed = await c.query<{ document_id: string | null }>(
        `DELETE FROM storage_deletions
         WHERE id = $1 AND status = 'processing' AND lease_expires_at > now()
         RETURNING document_id`,
        [id],
      );
      if (changed.rowCount && changed.rows[0].document_id) {
        await c.query(
          `UPDATE documents
           SET file_path = NULL,
               file_sha256 = NULL,
               byte_size = NULL,
               original_filename = NULL,
               media_type = NULL
           WHERE id = $1 AND deleted_at IS NOT NULL AND file_path = $2`,
          [changed.rows[0].document_id, key],
        );
      }
      await c.query('COMMIT');
    } catch (err) {
      await c.query('ROLLBACK').catch(() => {});
      throw err;
    } finally {
      c.release();
    }
  } catch (err) {
    const message = err instanceof Error ? err.message.slice(0, 200) : 'Storage delete error';
    await pool
      .query(
        `UPDATE storage_deletions
         SET status = CASE WHEN attempts >= 10 THEN 'failed' ELSE 'pending' END,
             error_message = $2,
             next_attempt_at = now() + (LEAST(attempts * attempts, 3600) * interval '1 minute'),
             updated_at = now()
         WHERE id = $1 AND status = 'processing'`,
        [id, message],
      )
      .catch(() => {});
    pinoLogger.error(
      { deletionId: id, errName: err instanceof Error ? err.name : 'Error' },
      'Object deletion failed',
    );
  }
  return true;
}
