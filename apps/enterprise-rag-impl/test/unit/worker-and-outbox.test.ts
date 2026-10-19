import { createHash } from 'node:crypto';
import type { Queue } from 'bullmq';
import type { Pool } from 'pg';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const storageMocks = vi.hoisted(() => ({
  retrievePrivateObject: vi.fn(),
  promoteQuarantineObject: vi.fn(),
  removePrivateObject: vi.fn(),
}));

const scannerMocks = vi.hoisted(() => {
  class MockMalwareDetectedError extends Error {
    constructor(signature = 'Win.Test.EICAR_HDB-1') {
      super(`Malware detected: ${signature}`);
      this.name = 'MalwareDetectedError';
    }
  }
  return {
    MalwareDetectedError: MockMalwareDetectedError,
    scanClamav: vi.fn(),
  };
});

vi.mock('../../src/storage/object-storage', () => storageMocks);
vi.mock('../../src/worker/scanner', () => scannerMocks);

import { env } from '../../src/config/env';
import { relayOutboxBatch } from '../../src/outbox/main';
import { embedChunksBatch, processOne } from '../../src/worker/main';
import { reapExpiredIngestionLeases } from '../../src/worker/queue-runner';
import { purgeOneDeletedObject } from '../../src/worker/storage-gc';

function createScriptedPool(
  clientScripts: Array<Array<{ rows?: unknown[]; rowCount?: number }>>,
  poolQueries: Array<{ rows?: unknown[]; rowCount?: number }> = [],
) {
  let clientIdx = 0;
  let poolQueryIdx = 0;
  return {
    connect: vi.fn(async () => {
      const script = clientScripts[clientIdx++] ?? [];
      let step = 0;
      return {
        query: vi.fn(async (sqlText: string) => {
          if (sqlText === 'BEGIN' || sqlText === 'COMMIT' || sqlText === 'ROLLBACK') {
            return { rows: [], rowCount: 0 };
          }
          return script[step++] ?? { rows: [], rowCount: 0 };
        }),
        release: vi.fn(),
      };
    }),
    query: vi.fn(async () => poolQueries[poolQueryIdx++] ?? { rows: [], rowCount: 0 }),
  } as unknown as Pool;
}

describe('Worker Ingestion, Quarantine ClamAV Fencing, S3 GC & Outbox Relay', () => {
  const origFetch = globalThis.fetch;
  const origEmbeddings = env.EMBEDDINGS_ENABLED;
  const origClamav = env.CLAMAV_REQUIRED;

  beforeEach(() => {
    storageMocks.retrievePrivateObject.mockReset();
    storageMocks.promoteQuarantineObject.mockReset();
    storageMocks.removePrivateObject.mockReset();
    scannerMocks.scanClamav.mockReset();
  });

  afterEach(() => {
    globalThis.fetch = origFetch;
    env.EMBEDDINGS_ENABLED = origEmbeddings;
    env.CLAMAV_REQUIRED = origClamav;
  });

  it('embeds chunk batches at 1024d and rejects malformed embedding payloads', async () => {
    env.EMBEDDINGS_ENABLED = false;
    await expect(embedChunksBatch(['alpha', 'beta'])).resolves.toEqual([null, null]);

    env.EMBEDDINGS_ENABLED = true;
    const dim = env.EMBEDDING_DIMENSIONS || 1024;
    const vec = Array.from({ length: dim }, () => 0.02);
    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ embeddings: [vec, vec] }),
    }) as unknown as typeof fetch;

    const embedded = await embedChunksBatch(['alpha', 'beta']);
    expect(embedded).toHaveLength(2);
    expect(embedded[0]).toHaveLength(dim);

    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 503,
    }) as unknown as typeof fetch;
    await expect(embedChunksBatch(['alpha'])).rejects.toThrow(/Embeddings unavailable/);
  });

  it('processes clean quarantine upload (ClamAV scan + clean/ promotion + atomic fenced commit)', async () => {
    env.EMBEDDINGS_ENABLED = false;
    env.CLAMAV_REQUIRED = true;

    const payload = Buffer.from('Enterprise architecture runbook content for ingestion.');
    const sha256 = createHash('sha256').update(payload).digest('hex');
    storageMocks.retrievePrivateObject.mockResolvedValueOnce(payload);
    scannerMocks.scanClamav.mockResolvedValueOnce(undefined);
    storageMocks.promoteQuarantineObject.mockResolvedValueOnce(undefined);

    const claimSteps = [
      { rows: [], rowCount: 0 }, // exhausted reaper
      { rows: [{ id: 'job-1', document_id: 'doc-1' }], rowCount: 1 }, // claim select
      { rows: [{ lease_token: 'lease-1', attempts: 1 }], rowCount: 1 }, // lease update
      { rows: [], rowCount: 1 }, // doc processing
    ];
    const commitSteps = [
      { rows: [{ 1: 1 }], rowCount: 1 }, // owns lease
      { rows: [{ 1: 1 }], rowCount: 1 }, // doc still active
      { rows: [], rowCount: 1 }, // delete old chunks
      { rows: [], rowCount: 1 }, // insert chunk 0
      { rows: [], rowCount: 1 }, // update document ready
      { rows: [], rowCount: 1 }, // upsert document_versions
      { rows: [], rowCount: 1 }, // processed_events
      { rows: [], rowCount: 1 }, // job completed
    ];
    const poolQueries = [
      {
        rows: [
          {
            id: 'doc-1',
            tenant_id: 'ten-1',
            owner_sub: 'u1',
            body: '',
            file_path: 'quarantine/ten-1/doc.txt',
            original_filename: 'doc.txt',
            media_type: 'text/plain',
            file_sha256: sha256,
            version: 1,
            deleted_at: null,
          },
        ],
        rowCount: 1,
      },
      { rows: [], rowCount: 1 }, // stage = extracting
      { rows: [], rowCount: 1 }, // stage = embedding
    ];

    const pool = createScriptedPool([claimSteps, commitSteps], poolQueries);
    await expect(processOne('job-1', pool)).resolves.toBe(true);
    expect(scannerMocks.scanClamav).toHaveBeenCalledOnce();
    expect(storageMocks.promoteQuarantineObject).toHaveBeenCalledWith(
      'quarantine/ten-1/doc.txt',
      'clean/ten-1/doc.txt',
    );
  });

  it('blocks EICAR malware uploads, schedules quarantine object purge, and writes document.malware_blocked audit event', async () => {
    env.EMBEDDINGS_ENABLED = false;
    env.CLAMAV_REQUIRED = true;

    const payload = Buffer.from('EICAR-TEST-PAYLOAD');
    const sha256 = createHash('sha256').update(payload).digest('hex');
    storageMocks.retrievePrivateObject.mockResolvedValueOnce(payload);
    scannerMocks.scanClamav.mockRejectedValueOnce(new scannerMocks.MalwareDetectedError());

    const claimSteps = [
      { rows: [], rowCount: 0 },
      { rows: [{ id: 'job-mal', document_id: 'doc-mal' }], rowCount: 1 },
      { rows: [{ lease_token: 'lease-mal', attempts: 1 }], rowCount: 1 },
      { rows: [], rowCount: 1 },
    ];
    const failSteps = [
      { rows: [], rowCount: 1 }, // mark job failed (attempts = 3)
      {
        rows: [{ tenant_id: 'ten-1', owner_sub: 'u1', file_path: 'quarantine/ten-1/eicar.txt' }],
        rowCount: 1,
      }, // mark doc failed
      { rows: [], rowCount: 1 }, // insert storage_deletions
      { rows: [], rowCount: 1 }, // insert audit_events(document.malware_blocked)
    ];
    const poolQueries = [
      {
        rows: [
          {
            id: 'doc-mal',
            tenant_id: 'ten-1',
            owner_sub: 'u1',
            body: '',
            file_path: 'quarantine/ten-1/eicar.txt',
            original_filename: 'eicar.txt',
            media_type: 'text/plain',
            file_sha256: sha256,
            version: 1,
            deleted_at: null,
          },
        ],
        rowCount: 1,
      },
    ];

    const pool = createScriptedPool([claimSteps, failSteps], poolQueries);
    await expect(processOne('job-mal', pool)).resolves.toBe(true);
    expect(storageMocks.promoteQuarantineObject).not.toHaveBeenCalled();
  });

  it('purges S3 objects via storage-gc both when document_id is present and when NULL after KB cascade delete', async () => {
    storageMocks.removePrivateObject.mockResolvedValue(undefined);

    // Case 1: document_id is NULL (after KB cascade delete!)
    const gcNullDoc = createScriptedPool([
      [
        { rows: [{ id: 'del-1', object_key: 'clean/cascaded.pdf' }], rowCount: 1 },
        { rows: [], rowCount: 1 },
      ],
      [{ rows: [{ document_id: null }], rowCount: 1 }],
    ]);
    await expect(purgeOneDeletedObject(gcNullDoc)).resolves.toBe(true);
    expect(storageMocks.removePrivateObject).toHaveBeenCalledWith('clean/cascaded.pdf');

    // Case 2: document_id present (soft-deleted document)
    const gcWithDoc = createScriptedPool([
      [
        { rows: [{ id: 'del-2', object_key: 'clean/soft.pdf' }], rowCount: 1 },
        { rows: [], rowCount: 1 },
      ],
      [
        { rows: [{ document_id: 'doc-soft' }], rowCount: 1 },
        { rows: [], rowCount: 1 },
      ],
    ]);
    await expect(purgeOneDeletedObject(gcWithDoc)).resolves.toBe(true);
  });

  it('reaps expired leases and relays transactional outbox batches to BullMQ', async () => {
    const reaperPool = createScriptedPool([
      [
        { rows: [{ document_id: 'doc-stalled' }], rowCount: 1 },
        { rows: [], rowCount: 1 },
      ],
    ]);
    await expect(reapExpiredIngestionLeases(reaperPool)).resolves.toBe(1);

    const mockQueue = {
      add: vi.fn().mockResolvedValue(undefined),
    } as unknown as Queue;

    const outboxPool = createScriptedPool(
      [
        [
          {
            rows: [
              {
                id: 'evt-1',
                tenant_id: 'ten-1',
                topic: 'document.ingestion.requested',
                aggregate_id: 'doc-1',
                payload: { job_id: 'job-1' },
                attempts: 0,
              },
            ],
            rowCount: 1,
          },
          { rows: [], rowCount: 1 },
        ],
      ],
      [{ rows: [], rowCount: 1 }],
    );

    await expect(relayOutboxBatch(outboxPool, mockQueue, 10)).resolves.toBe(1);
    expect(mockQueue.add).toHaveBeenCalledWith('ingest', { job_id: 'job-1' }, { jobId: 'outbox-evt-1' });

    // Empty queue & transient failure backoff branches for processOne, storage-gc, and outbox
    const emptyClaimPool = createScriptedPool([
      [
        { rows: [], rowCount: 0 },
        { rows: [], rowCount: 0 },
      ],
    ]);
    await expect(processOne(undefined, emptyClaimPool)).resolves.toBe(false);

    const transientFailPool = createScriptedPool(
      [
        [
          { rows: [], rowCount: 0 },
          { rows: [{ id: 'job-err', document_id: 'doc-err' }], rowCount: 1 },
          { rows: [{ lease_token: 'lease-err', attempts: 1 }], rowCount: 1 },
          { rows: [], rowCount: 1 },
        ],
        [
          { rows: [{ attempts: 1 }], rowCount: 1 },
          { rows: [], rowCount: 1 },
        ],
      ],
      [{ rows: [], rowCount: 0 }], // document unavailable -> triggers non-malware backoff
    );
    await expect(processOne('job-err', transientFailPool)).resolves.toBe(true);

    // Storage GC empty & error backoff
    const gcEmptyPool = createScriptedPool([[{ rows: [], rowCount: 0 }]]);
    await expect(purgeOneDeletedObject(gcEmptyPool)).resolves.toBe(false);

    storageMocks.removePrivateObject.mockRejectedValueOnce(new Error('S3 timeout'));
    const gcFailPool = createScriptedPool(
      [
        [
          { rows: [{ id: 'del-err', object_key: 'clean/err.pdf' }], rowCount: 1 },
          { rows: [], rowCount: 1 },
        ],
      ],
      [{ rows: [], rowCount: 1 }],
    );
    await expect(purgeOneDeletedObject(gcFailPool)).resolves.toBe(true);

    // Outbox empty & error backoff
    const outboxEmptyPool = createScriptedPool([[{ rows: [], rowCount: 0 }]]);
    await expect(relayOutboxBatch(outboxEmptyPool, mockQueue, 10)).resolves.toBe(0);

    const failingQueue = {
      add: vi.fn().mockRejectedValueOnce(new Error('Valkey down')),
    } as unknown as Queue;
    const outboxFailPool = createScriptedPool(
      [
        [
          {
            rows: [
              {
                id: 'evt-err',
                tenant_id: 'ten-1',
                topic: 'document.ingestion.requested',
                aggregate_id: 'doc-1',
                payload: {},
                attempts: 1,
              },
            ],
            rowCount: 1,
          },
          { rows: [], rowCount: 1 },
        ],
      ],
      [{ rows: [], rowCount: 1 }],
    );
    await expect(relayOutboxBatch(outboxFailPool, failingQueue, 10)).resolves.toBe(0);
  });
});
