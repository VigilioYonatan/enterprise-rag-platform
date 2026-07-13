import pino from 'pino';
import { env } from '../config/env';
import { ensurePrivateBucket } from '../storage/object-storage';

const logger = pino({
  name: 'rag-platform-setup',
  level: env.LOG_LEVEL,
  redact: ['OBJECT_STORAGE_ACCESS_KEY', 'OBJECT_STORAGE_SECRET_KEY'],
});

/**
 * One-shot platform bootstrap (`profiles: [tools]`) initializing private buckets on RustFS
 * via S3 REST SigV4 without requiring proprietary MinIO mc binaries.
 */
async function main(): Promise<void> {
  await ensurePrivateBucket();
  logger.info({ bucket: env.OBJECT_STORAGE_BUCKET }, 'Private S3 bucket verified on RustFS');
}

main().catch((error: unknown) => {
  logger.error({ err: error }, 'Platform setup failed');
  process.exitCode = 1;
});
