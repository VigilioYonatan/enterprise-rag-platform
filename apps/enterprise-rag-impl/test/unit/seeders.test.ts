import type { Pool, PoolClient } from 'pg';
import { describe, expect, it, vi } from 'vitest';
import {
  embedSeedTextsWithOllama,
  runLocalSeeders,
  SeedRunner,
  syncKeycloakSeedActors,
} from '../../src/shared/infrastructure/database/seeders/seed-runner';
import {
  buildSeedIds,
  DEFAULT_SEED_ACTORS,
  deterministicSeedUuid,
} from '../../src/shared/infrastructure/database/seeders/seed-types';

function createRecordingPool(shouldFailOnMatch?: RegExp): {
  pool: Pool;
  queries: Array<{ sql: string; params?: unknown[] }>;
  releasedCount: () => number;
} {
  const queries: Array<{ sql: string; params?: unknown[] }> = [];
  let released = 0;

  const client = {
    query: vi.fn(async (queryTextOrConfig: unknown, values?: unknown[]) => {
      const sqlText =
        typeof queryTextOrConfig === 'string'
          ? queryTextOrConfig
          : String((queryTextOrConfig as { text?: string }).text ?? '');
      const params =
        typeof queryTextOrConfig === 'string' ? values : (queryTextOrConfig as { values?: unknown[] }).values;
      queries.push({ sql: sqlText, params });
      if (shouldFailOnMatch?.test(sqlText)) {
        throw new Error('Simulated SQL failure');
      }
      return { rows: [], rowCount: 1 };
    }),
    release: vi.fn(() => {
      released += 1;
    }),
  } as unknown as PoolClient;

  const pool = {
    connect: vi.fn(async () => client),
    end: vi.fn(async () => undefined),
  } as unknown as Pool;

  return { pool, queries, releasedCount: () => released };
}

describe('Enterprise DDD Local Seeders', () => {
  it('generates deterministic RFC-4122 v4-shaped UUIDs scoped per owner identity', () => {
    const idA1 = deterministicSeedUuid('ns-1', 'tenant:demo');
    const idA2 = deterministicSeedUuid('ns-1', 'tenant:demo');
    const idB = deterministicSeedUuid('ns-2', 'tenant:demo');

    expect(idA1).toBe(idA2);
    expect(idA1).not.toBe(idB);
    expect(idA1).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);

    const ownerIds1 = buildSeedIds(DEFAULT_SEED_ACTORS.owner.sub);
    const ownerIds2 = buildSeedIds(DEFAULT_SEED_ACTORS.owner.sub);
    const otherIds = buildSeedIds('custom-kc-sub-999');

    expect(ownerIds1).toEqual(ownerIds2);
    expect(ownerIds1.tenantId).not.toBe(otherIds.tenantId);
  });

  it('unconditionally refuses execution when NODE_ENV is production', async () => {
    const runner = new SeedRunner({
      nodeEnv: 'production',
      appDatabaseUrl: 'postgresql://rag_app:test@127.0.0.1:5432/rag',
    });
    await expect(runner.run()).rejects.toThrow(/NODE_ENV=production/);
  });

  it('handles Ollama seed embeddings gracefully across enabled, invalid-dim and offline states', async () => {
    const disabled = await embedSeedTextsWithOllama(['hola'], {
      enabled: false,
      url: 'http://127.0.0.1:11434',
      model: 'qwen3-embedding:0.6b',
      expectedDimensions: 4,
    });
    expect(disabled).toEqual({ vectors: [null], generated: false });

    const okFetch = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            embeddings: [
              [0.1, 0.2, 0.3, 0.4],
              [0.5, 0.6, 0.7, 0.8],
            ],
          }),
          { status: 200 },
        ),
    );
    const valid = await embedSeedTextsWithOllama(
      ['uno', 'dos'],
      {
        enabled: true,
        url: 'http://127.0.0.1:11434/',
        model: 'qwen3-embedding:0.6b',
        expectedDimensions: 4,
      },
      okFetch as unknown as typeof fetch,
    );
    expect(valid.generated).toBe(true);
    expect(valid.vectors).toHaveLength(2);
    expect(valid.vectors[0]).toEqual([0.1, 0.2, 0.3, 0.4]);

    const wrongDimFetch = vi.fn(
      async () => new Response(JSON.stringify({ embeddings: [[0.1, 0.2]] }), { status: 200 }),
    );
    const wrongDim = await embedSeedTextsWithOllama(
      ['uno'],
      {
        enabled: true,
        url: 'http://127.0.0.1:11434',
        model: 'qwen3-embedding:0.6b',
        expectedDimensions: 4,
      },
      wrongDimFetch as unknown as typeof fetch,
    );
    expect(wrongDim).toEqual({ vectors: [null], generated: false });

    const offlineFetch = vi.fn(async () => {
      throw new Error('ECONNREFUSED');
    });
    const offline = await embedSeedTextsWithOllama(
      ['uno'],
      {
        enabled: true,
        url: 'http://127.0.0.1:11434',
        model: 'qwen3-embedding:0.6b',
        expectedDimensions: 4,
      },
      offlineFetch as unknown as typeof fetch,
    );
    expect(offline).toEqual({ vectors: [null], generated: false });
  });

  it('synchronizes demo actors in Keycloak (create + existing lookup + password sync)', async () => {
    const createdEmails = new Set<string>(['owner.demo@atlas.local']);
    const kcFetch = vi.fn(async (input: Parameters<typeof fetch>[0], init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? 'GET';
      if (url.endsWith('/realms/master/protocol/openid-connect/token')) {
        return new Response(JSON.stringify({ access_token: 'adm-tok' }), { status: 200 });
      }
      if (url.includes('/users?email=') && method === 'GET') {
        const parsed = new URL(url);
        const email = parsed.searchParams.get('email') ?? '';
        if (createdEmails.has(email)) {
          return new Response(JSON.stringify([{ id: `kc-${email}`, email }]), { status: 200 });
        }
        return new Response(JSON.stringify([]), { status: 200 });
      }
      if (url.endsWith('/users') && method === 'POST') {
        const body = JSON.parse(String(init?.body ?? '{}')) as { email: string };
        createdEmails.add(body.email);
        return new Response('', { status: 201 });
      }
      if (url.includes('/reset-password') && method === 'PUT') {
        return new Response(null, { status: 204 });
      }
      return new Response('Not found', { status: 404 });
    });

    const synced = await syncKeycloakSeedActors(
      {
        baseUrl: 'http://localhost:18081/',
        realm: 'enterprise',
        adminUser: 'kcadmin',
        adminPassword: 'ephemeral-test-only-admin-pwd',
        demoUserPassword: 'ephemeral-test-only-demo-pwd',
      },
      kcFetch as unknown as typeof fetch,
    );

    expect(synced.owner.sub).toBe('kc-owner.demo@atlas.local');
    expect(synced.admin.sub).toBe('kc-admin.demo@atlas.local');
    expect(synced.viewer.sub).toBe('kc-viewer.demo@atlas.local');
  });

  it('executes Knowledge, Governance, Conversations and Evaluations seeders idempotently under RLS & worker roles', async () => {
    const appRec = createRecordingPool();
    const workerRec = createRecordingPool();
    const embedFetch = vi.fn(async (_url: Parameters<typeof fetch>[0], init?: RequestInit) => {
      const parsed = JSON.parse(String(init?.body ?? '{}')) as { input: string[] };
      return new Response(
        JSON.stringify({
          embeddings: parsed.input.map((_, idx) => [idx + 0.1, idx + 0.2, idx + 0.3, idx + 0.4]),
        }),
        { status: 200 },
      );
    });

    const run1 = await runLocalSeeders({
      nodeEnv: 'test',
      appDatabaseUrl: 'postgresql://rag_app:test@127.0.0.1:5432/rag',
      appPool: appRec.pool,
      workerPool: workerRec.pool,
      ollama: {
        enabled: true,
        url: 'http://127.0.0.1:11434',
        model: 'qwen3-embedding:0.6b',
        expectedDimensions: 4,
      },
      fetchImpl: embedFetch as unknown as typeof fetch,
    });

    const run2 = await runLocalSeeders({
      nodeEnv: 'test',
      appDatabaseUrl: 'postgresql://rag_app:test@127.0.0.1:5432/rag',
      appPool: appRec.pool,
      workerPool: workerRec.pool,
      ollama: {
        enabled: false,
        url: 'http://127.0.0.1:11434',
        model: 'qwen3-embedding:0.6b',
        expectedDimensions: 4,
      },
    });

    expect(run1.tenantId).toBe(run2.tenantId);
    expect(run1.embeddingsGenerated).toBe(true);
    expect(run2.embeddingsGenerated).toBe(false);

    const appSqlJoined = appRec.queries.map((q) => q.sql).join('\n');
    const workerSqlJoined = workerRec.queries.map((q) => q.sql).join('\n');

    // Verify RLS context (`app.actor_sub`) and all 4 feature domains were exercised with ON CONFLICT idempotency
    expect(appSqlJoined).toContain("set_config('app.actor_sub'");
    expect(appSqlJoined).toMatch(/insert into "tenants"/i);
    expect(appSqlJoined).toMatch(/insert into "knowledge_bases"/i);
    expect(appSqlJoined).toMatch(/insert into "documents"/i);
    expect(appSqlJoined).toMatch(/insert into "access_groups"/i);
    expect(appSqlJoined).toMatch(/insert into "tenant_budgets"/i);
    expect(appSqlJoined).toMatch(/insert into "conversations"/i);
    expect(appSqlJoined).toMatch(/insert into "answer_citations"/i);
    expect(appSqlJoined).toMatch(/insert into "evaluation_datasets"/i);
    expect(appSqlJoined).toMatch(/insert into "evaluation_cases"/i);
    expect(appSqlJoined).toMatch(/insert into "evaluation_results"/i);
    expect(workerSqlJoined).toMatch(/INSERT INTO document_chunks/i);
    expect(workerSqlJoined).toMatch(/insert into "processed_events"/i);
    expect(appRec.releasedCount()).toBeGreaterThan(0);
    expect(workerRec.releasedCount()).toBeGreaterThan(0);
  });

  it('rolls back cleanly when a SQL statement throws inside a seeder transaction', async () => {
    const failingApp = createRecordingPool(/insert into "tenants"/i);
    const workerRec = createRecordingPool();

    await expect(
      runLocalSeeders({
        nodeEnv: 'test',
        appDatabaseUrl: 'postgresql://rag_app:test@127.0.0.1:5432/rag',
        appPool: failingApp.pool,
        workerPool: workerRec.pool,
      }),
    ).rejects.toThrow(/insert into "tenants"|Simulated SQL failure/i);

    expect(failingApp.queries.some((q) => q.sql === 'ROLLBACK')).toBe(true);
  });
});
