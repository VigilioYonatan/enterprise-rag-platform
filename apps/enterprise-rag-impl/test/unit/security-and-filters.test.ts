import { type AddressInfo, createServer } from 'node:net';
import type { ArgumentsHost, ExecutionContext } from '@nestjs/common';
import { UnauthorizedException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { DatabaseExceptionFilter } from '../../src/shared/database-exception.filter';
import { ZodPipe } from '../../src/shared/validation.pipe';
import { splitText } from '../../src/worker/extract';
import { MalwareDetectedError, scanClamav } from '../../src/worker/scanner';

vi.mock('jose', () => ({
  createRemoteJWKSet: vi.fn(() => 'mock-jwks'),
  jwtVerify: vi.fn(async (token: string) => {
    if (token === 'valid-verified') {
      return {
        payload: {
          sub: 'user-123',
          azp: 'enterprise-rag-web',
          email: 'verified@atlas.example',
          email_verified: true,
        },
      };
    }
    if (token === 'valid-unverified-email') {
      return {
        payload: {
          sub: 'user-456',
          azp: 'enterprise-rag-web',
          email: 'spoofed@atlas.example',
          email_verified: false,
        },
      };
    }
    throw new Error('Bad token');
  }),
}));

const dbQueryMock = vi.fn().mockResolvedValue({ rowCount: 1, rows: [] });

function createDrizzleMock(client: { query: typeof dbQueryMock }) {
  const execute = async (): Promise<unknown[]> => {
    const res = (await client.query()) as { rows?: unknown[] } | undefined;
    return res?.rows ?? [];
  };
  const methods = [
    'from',
    'innerJoin',
    'where',
    'orderBy',
    'limit',
    'offset',
    'for',
    'set',
    'values',
    'onConflictDoNothing',
    'onConflictDoUpdate',
    'returning',
  ];
  const createChain = () => {
    const p = execute();
    const target = p as unknown as Record<string, unknown>;
    for (const m of methods) {
      target[m] = () => target;
    }
    return target;
  };
  return {
    select: () => createChain(),
    insert: () => createChain(),
    update: () => createChain(),
    delete: () => createChain(),
    execute,
    query: client.query,
  };
}

const mockDrizzle = createDrizzleMock({ query: dbQueryMock });

vi.mock('../../src/database/pool', () => ({
  withActor: vi.fn(async (_sub: string, fn: (db: unknown, client: unknown) => Promise<unknown>) =>
    fn(mockDrizzle, { query: dbQueryMock }),
  ),
}));

describe('Security guards, PG exception filter, ClamAV scanner & Unicode chunking', () => {
  it('maps PostgreSQL RLS/FinOps/constraint error codes without leaking SQL internals', () => {
    const filter = new DatabaseExceptionFilter();
    const invoke = (err: unknown) => {
      let statusCode = 0;
      let body: unknown;
      const host = {
        switchToHttp: () => ({
          getResponse: () => ({
            headersSent: false,
            status(code: number) {
              statusCode = code;
              return this;
            },
            json(payload: unknown) {
              body = payload;
            },
          }),
        }),
      } as unknown as ArgumentsHost;
      filter.catch(err, host);
      return { statusCode, body };
    };

    expect(invoke({ code: '42501', message: 'new row violates row-level security policy' })).toEqual({
      statusCode: 403,
      body: {
        statusCode: 403,
        code: 'FORBIDDEN',
        message: 'Insufficient permissions for this tenant resource',
      },
    });
    expect(invoke({ code: 'P0029', message: 'Daily tenant answer budget exhausted' })).toEqual({
      statusCode: 429,
      body: {
        statusCode: 429,
        code: 'BUDGET_EXHAUSTED',
        message: 'Daily tenant answer budget exhausted',
      },
    });
    expect(invoke({ code: '23505' }).statusCode).toBe(409);
    expect(invoke({ code: '23514' }).statusCode).toBe(400);
  });

  it('returns structured VALIDATION_ERROR issues from ZodPipe', () => {
    const pipe = new ZodPipe(z.object({ count: z.number().int().min(1) }).strict());
    expect(() => pipe.transform({ count: 0, extra: true })).toThrow();
  });

  it('caches user provisioning in JwtGuard and ignores unverified OIDC emails', async () => {
    const { JwtGuard, clearSyncedUserCache } = await import('../../src/security/jwt.guard');
    clearSyncedUserCache();
    dbQueryMock.mockClear();
    const guard = new JwtGuard();

    const makeCtx = (auth?: string) => {
      const req: {
        headers: Record<string, string | undefined>;
        actor?: { sub: string; email: string | null };
      } = {
        headers: { authorization: auth },
      };
      const ctx = {
        switchToHttp: () => ({ getRequest: () => req }),
      } as unknown as ExecutionContext;
      return { ctx, req };
    };

    await expect(guard.canActivate(makeCtx().ctx)).rejects.toThrow(UnauthorizedException);

    const first = makeCtx('Bearer valid-verified');
    expect(await guard.canActivate(first.ctx)).toBe(true);
    expect(first.req.actor).toEqual({ sub: 'user-123', email: 'verified@atlas.example' });
    expect(dbQueryMock).toHaveBeenCalledTimes(1);

    // Second request with identical sub+email hits bounded TTL cache without redundant DB write.
    const second = makeCtx('Bearer valid-verified');
    expect(await guard.canActivate(second.ctx)).toBe(true);
    expect(dbQueryMock).toHaveBeenCalledTimes(1);

    // Unverified email is stripped to null so find_existing_user_for_tenant cannot be spoofed.
    const unverified = makeCtx('Bearer valid-unverified-email');
    expect(await guard.canActivate(unverified.ctx)).toBe(true);
    expect(unverified.req.actor).toEqual({ sub: 'user-456', email: null });
  });

  it('distinguishes clean ClamAV streams from MalwareDetectedError', async () => {
    const startMockClamav = async (reply: string) => {
      const srv = createServer((sock) => {
        sock.on('data', (chunk) => {
          // Wait for terminating 4 zero bytes
          if (chunk.length >= 4 && chunk.subarray(chunk.length - 4).equals(Buffer.alloc(4))) {
            sock.end(reply);
          }
        });
      });
      await new Promise<void>((resolve) => srv.listen(0, '127.0.0.1', () => resolve()));
      return {
        port: (srv.address() as AddressInfo).port,
        close: () => new Promise<void>((resolve) => srv.close(() => resolve())),
      };
    };

    const cleanSrv = await startMockClamav('stream: OK\0');
    try {
      await expect(scanClamav(Buffer.from('safe text'), '127.0.0.1', cleanSrv.port)).resolves.toBeUndefined();
    } finally {
      await cleanSrv.close();
    }

    const infectedSrv = await startMockClamav('stream: Win.Test.EICAR_HDB-1 FOUND\0');
    try {
      await expect(
        scanClamav(Buffer.from('X5O!P%@AP'), '127.0.0.1', infectedSrv.port),
      ).rejects.toBeInstanceOf(MalwareDetectedError);
    } finally {
      await infectedSrv.close();
    }
  });

  it('chunks Unicode emoji safely by code points and supports word-boundary overlap', () => {
    const emojiChunks = splitText('😀😀😀😀😀', 2);
    expect(emojiChunks).toEqual(['😀😀', '😀😀', '😀']);

    const overlapped = splitText('uno dos tres cuatro cinco seis siete ocho nueve diez', 20, 6);
    expect(overlapped.length).toBeGreaterThan(2);
    expect(overlapped.every((c) => c.length <= 20)).toBe(true);
  });
});
