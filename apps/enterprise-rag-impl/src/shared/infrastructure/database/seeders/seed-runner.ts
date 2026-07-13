import { Pool, type PoolClient } from 'pg';
import { seedConversations } from '../../../../modules/conversations/infrastructure/seeders/conversations.seeder';
import { seedEvaluations } from '../../../../modules/evaluations/infrastructure/seeders/evaluations.seeder';
import { seedGovernance } from '../../../../modules/governance/infrastructure/seeders/governance.seeder';
import { seedKnowledge } from '../../../../modules/knowledge/infrastructure/seeders/knowledge.seeder';
import {
  buildSeedIds,
  createSeedDrizzle,
  DEFAULT_SEED_ACTORS,
  type SeedActorIdentity,
  type SeedActors,
  type SeedDrizzleDb,
  type SeedExecutionContext,
  type SeedIds,
} from './seed-types';

export interface SeedKeycloakSyncConfig {
  baseUrl: string;
  realm: string;
  adminUser: string;
  adminPassword: string;
  demoUserPassword: string;
}

export interface SeedOllamaConfig {
  enabled: boolean;
  url: string;
  model: string;
  expectedDimensions: number;
}

export interface RunLocalSeedersOptions {
  nodeEnv?: string;
  appDatabaseUrl: string;
  workerDatabaseUrl?: string;
  appPool?: Pool;
  workerPool?: Pool;
  actors?: SeedActors;
  keycloak?: SeedKeycloakSyncConfig;
  ollama?: SeedOllamaConfig;
  fetchImpl?: typeof fetch;
}

export interface SeedRunSummary {
  tenantId: string;
  securityKbId: string;
  finopsKbId: string;
  actors: SeedActors;
  ids: SeedIds;
  embeddingsGenerated: boolean;
  keycloakSynced: boolean;
}

export async function syncKeycloakSeedActors(
  cfg: SeedKeycloakSyncConfig,
  fetchFn: typeof fetch = fetch,
): Promise<SeedActors> {
  const base = cfg.baseUrl.replace(/\/+$/, '');
  const tokenRes = await fetchFn(`${base}/realms/master/protocol/openid-connect/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'password',
      client_id: 'admin-cli',
      username: cfg.adminUser,
      password: cfg.adminPassword,
    }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!tokenRes.ok) {
    throw new Error(`Keycloak admin authentication failed (${tokenRes.status})`);
  }
  const { access_token } = (await tokenRes.json()) as { access_token: string };
  const authHeaders = {
    Authorization: `Bearer ${access_token}`,
    'Content-Type': 'application/json',
  };

  const ensureUser = async (fallback: SeedActorIdentity, firstName: string): Promise<SeedActorIdentity> => {
    const queryUrl = `${base}/admin/realms/${encodeURIComponent(cfg.realm)}/users?email=${encodeURIComponent(fallback.email)}&exact=true`;
    const listRes = await fetchFn(queryUrl, {
      headers: { Authorization: `Bearer ${access_token}` },
      signal: AbortSignal.timeout(15_000),
    });
    if (!listRes.ok) {
      throw new Error(`Keycloak user lookup failed (${listRes.status})`);
    }
    const existing = (await listRes.json()) as Array<{ id: string; email?: string }>;
    let userId = existing[0]?.id;

    if (!userId) {
      const createRes = await fetchFn(`${base}/admin/realms/${encodeURIComponent(cfg.realm)}/users`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          username: fallback.email,
          email: fallback.email,
          firstName,
          lastName: 'Demo',
          enabled: true,
          emailVerified: true,
        }),
        signal: AbortSignal.timeout(15_000),
      });
      if (!createRes.ok && createRes.status !== 409) {
        throw new Error(`Keycloak user creation failed (${createRes.status})`);
      }
      const retryRes = await fetchFn(queryUrl, {
        headers: { Authorization: `Bearer ${access_token}` },
        signal: AbortSignal.timeout(15_000),
      });
      const retryList = (await retryRes.json()) as Array<{ id: string }>;
      userId = retryList[0]?.id;
    }

    if (!userId) {
      throw new Error(`Unable to resolve Keycloak sub for ${fallback.email}`);
    }

    const pwdRes = await fetchFn(
      `${base}/admin/realms/${encodeURIComponent(cfg.realm)}/users/${encodeURIComponent(userId)}/reset-password`,
      {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify({
          type: 'password',
          value: cfg.demoUserPassword,
          temporary: false,
        }),
        signal: AbortSignal.timeout(15_000),
      },
    );
    if (!pwdRes.ok) {
      throw new Error(`Keycloak password sync failed (${pwdRes.status})`);
    }

    return { sub: userId, email: fallback.email };
  };

  return {
    owner: await ensureUser(DEFAULT_SEED_ACTORS.owner, 'Propietaria'),
    admin: await ensureUser(DEFAULT_SEED_ACTORS.admin, 'Administrador'),
    viewer: await ensureUser(DEFAULT_SEED_ACTORS.viewer, 'Lectora'),
  };
}

export async function embedSeedTextsWithOllama(
  texts: string[],
  cfg?: SeedOllamaConfig,
  fetchFn: typeof fetch = fetch,
): Promise<{ vectors: Array<number[] | null>; generated: boolean }> {
  if (!cfg?.enabled || texts.length === 0) {
    return { vectors: texts.map(() => null), generated: false };
  }
  try {
    const res = await fetchFn(`${cfg.url.replace(/\/+$/, '')}/api/embed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: cfg.model, input: texts }),
      signal: AbortSignal.timeout(45_000),
    });
    if (!res.ok) {
      return { vectors: texts.map(() => null), generated: false };
    }
    const payload = (await res.json()) as { embeddings?: unknown };
    if (!Array.isArray(payload.embeddings) || payload.embeddings.length !== texts.length) {
      return { vectors: texts.map(() => null), generated: false };
    }
    const dim = cfg.expectedDimensions || 1024;
    const validated: Array<number[] | null> = [];
    for (const vec of payload.embeddings) {
      if (
        !Array.isArray(vec) ||
        vec.length !== dim ||
        vec.some((v) => typeof v !== 'number' || !Number.isFinite(v))
      ) {
        return { vectors: texts.map(() => null), generated: false };
      }
      validated.push(vec as number[]);
    }
    return { vectors: validated, generated: true };
  } catch {
    return { vectors: texts.map(() => null), generated: false };
  }
}

export class SeedRunner {
  constructor(private readonly options: RunLocalSeedersOptions) {}

  async run(): Promise<SeedRunSummary> {
    const effectiveEnv = this.options.nodeEnv ?? process.env.NODE_ENV ?? 'development';
    if (effectiveEnv === 'production') {
      throw new Error('Refusing to run local/demo seeders when NODE_ENV=production');
    }

    const fetchFn = this.options.fetchImpl ?? fetch;
    let actors = this.options.actors ?? DEFAULT_SEED_ACTORS;
    let keycloakSynced = false;

    if (this.options.keycloak) {
      actors = await syncKeycloakSeedActors(this.options.keycloak, fetchFn);
      keycloakSynced = true;
    }

    const ids = buildSeedIds(actors.owner.sub);
    const ownsAppPool = !this.options.appPool;
    const ownsWorkerPool = !this.options.workerPool;
    const appPool =
      this.options.appPool ??
      new Pool({
        connectionString: this.options.appDatabaseUrl,
        max: 4,
        idleTimeoutMillis: 10_000,
      });
    const workerPool =
      this.options.workerPool ??
      new Pool({
        connectionString: this.options.workerDatabaseUrl ?? this.options.appDatabaseUrl,
        max: 4,
        idleTimeoutMillis: 10_000,
      });

    let embeddingsGenerated = false;
    const embeddingModelName = this.options.ollama?.model ?? 'qwen3-embedding:0.6b';

    try {
      const withActorDb = async <T>(
        actorSub: string,
        fn: (db: SeedDrizzleDb, client: PoolClient) => Promise<T>,
      ): Promise<T> => {
        const client = await appPool.connect();
        try {
          await client.query('BEGIN');
          await client.query('SET LOCAL statement_timeout = 30000');
          await client.query("SELECT set_config('app.actor_sub', $1, true)", [actorSub]);
          const db = createSeedDrizzle(client);
          const result = await fn(db, client);
          await client.query('COMMIT');
          return result;
        } catch (err) {
          await client.query('ROLLBACK').catch(() => {});
          throw err;
        } finally {
          client.release();
        }
      };

      const withWorkerDb = async <T>(
        fn: (db: SeedDrizzleDb, client: PoolClient) => Promise<T>,
      ): Promise<T> => {
        const client = await workerPool.connect();
        try {
          await client.query('BEGIN');
          await client.query('SET LOCAL statement_timeout = 30000');
          const db = createSeedDrizzle(client);
          const result = await fn(db, client);
          await client.query('COMMIT');
          return result;
        } catch (err) {
          await client.query('ROLLBACK').catch(() => {});
          throw err;
        } finally {
          client.release();
        }
      };

      const ctx: SeedExecutionContext = {
        actors,
        ids,
        embeddingModelName,
        embedBatch: async (texts: string[]) => {
          const out = await embedSeedTextsWithOllama(texts, this.options.ollama, fetchFn);
          embeddingsGenerated = embeddingsGenerated || out.generated;
          return out.vectors;
        },
        withActorDb,
        withWorkerDb,
      };

      await seedKnowledge(ctx);
      await seedGovernance(ctx);
      await seedConversations(ctx);
      await seedEvaluations(ctx);

      return {
        tenantId: ids.tenantId,
        securityKbId: ids.securityKbId,
        finopsKbId: ids.finopsKbId,
        actors,
        ids,
        embeddingsGenerated,
        keycloakSynced,
      };
    } finally {
      if (ownsAppPool) {
        await appPool.end().catch(() => {});
      }
      if (ownsWorkerPool && workerPool !== appPool) {
        await workerPool.end().catch(() => {});
      }
    }
  }
}

export async function runLocalSeeders(options: RunLocalSeedersOptions): Promise<SeedRunSummary> {
  return new SeedRunner(options).run();
}
