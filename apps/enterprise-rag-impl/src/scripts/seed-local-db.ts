import pino from 'pino';
import { env } from '../config/env';
import {
  runLocalSeeders,
  type SeedKeycloakSyncConfig,
} from '../shared/infrastructure/database/seeders/seed-runner';
import { ensurePrivateBucket } from '../storage/object-storage';

const seedLogger = pino({
  name: 'enterprise-rag-seeder',
  level: process.env.LOG_LEVEL ?? 'info',
});

async function main(): Promise<void> {
  const nodeEnv = process.env.NODE_ENV ?? 'development';
  if (nodeEnv === 'production') {
    throw new Error('Refusing to run db:seed:local when NODE_ENV=production');
  }

  const appDatabaseUrl = process.env.DATABASE_URL;
  if (!appDatabaseUrl) {
    throw new Error('DATABASE_URL is required to run db:seed:local');
  }

  const workerDatabaseUrl = process.env.WORKER_DATABASE_URL ?? appDatabaseUrl;
  const keycloakBaseUrl = process.env.SEED_KEYCLOAK_URL;
  let keycloak: SeedKeycloakSyncConfig | undefined;

  if (keycloakBaseUrl) {
    const adminUser = process.env.SEED_KEYCLOAK_ADMIN_USER;
    const adminPassword = process.env.SEED_KEYCLOAK_ADMIN_PASSWORD;
    const demoUserPassword = process.env.SEED_DEMO_USER_PASSWORD;
    if (!adminUser || !adminPassword || !demoUserPassword) {
      throw new Error(
        'SEED_KEYCLOAK_ADMIN_USER, SEED_KEYCLOAK_ADMIN_PASSWORD and SEED_DEMO_USER_PASSWORD are required when SEED_KEYCLOAK_URL is set',
      );
    }
    keycloak = {
      baseUrl: keycloakBaseUrl,
      realm: process.env.SEED_KEYCLOAK_REALM ?? 'enterprise',
      adminUser,
      adminPassword,
      demoUserPassword,
    };
  }

  const embeddingsEnabled = env.EMBEDDINGS_ENABLED;
  const ollamaUrl = process.env.OLLAMA_URL ?? 'http://127.0.0.1:11434';
  const ollamaModel = process.env.OLLAMA_EMBED_MODEL ?? 'qwen3-embedding:0.6b';
  const expectedDimensions = Number(process.env.EMBEDDING_DIMENSIONS ?? '1024') || 1024;

  await ensurePrivateBucket().catch((err) => {
    seedLogger.warn(
      { error: err instanceof Error ? err.message : String(err) },
      'Could not ensure S3 bucket during seed',
    );
  });

  const summary = await runLocalSeeders({
    nodeEnv,
    appDatabaseUrl,
    workerDatabaseUrl,
    keycloak,
    ollama: {
      enabled: embeddingsEnabled,
      url: ollamaUrl,
      model: ollamaModel,
      expectedDimensions,
    },
  });

  seedLogger.info(
    {
      tenantId: summary.tenantId,
      securityKbId: summary.securityKbId,
      finopsKbId: summary.finopsKbId,
      ownerEmail: summary.actors.owner.email,
      adminEmail: summary.actors.admin.email,
      viewerEmail: summary.actors.viewer.email,
      embeddingsGenerated: summary.embeddingsGenerated,
      keycloakSynced: summary.keycloakSynced,
    },
    'Enterprise RAG local DDD seeders completed idempotently',
  );
}

main().catch((err: unknown) => {
  const baseMessage = err instanceof Error ? err.message : String(err);
  const cause = err instanceof Error && err.cause instanceof Error ? ` (cause: ${err.cause.message})` : '';
  process.stderr.write(`Seed failed: ${baseMessage}${cause}\n`);
  process.exit(1);
});
