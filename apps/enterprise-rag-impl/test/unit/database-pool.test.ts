import { describe, expect, it, vi } from 'vitest';
import { closePool, pool, withActor } from '../../src/database/pool';

describe('Database Pool & Actor RLS Transaction Wrapper', () => {
  it('commits actor-scoped transaction with app.actor_sub and rolls back on failure', async () => {
    const queries: string[] = [];
    const mockClient = {
      query: vi.fn(async (sql: string) => {
        queries.push(sql);
        return { rows: [], rowCount: 0 };
      }),
      release: vi.fn(),
    };

    const connectSpy = vi.spyOn(pool, 'connect').mockResolvedValue(mockClient as never);
    const endSpy = vi.spyOn(pool, 'end').mockResolvedValue(undefined as never);

    const res = await withActor('user-123', async () => 'done');
    expect(res).toBe('done');
    expect(queries).toContain('BEGIN');
    expect(queries).toContain("SELECT set_config('app.actor_sub', $1, true)");
    expect(queries).toContain('COMMIT');
    expect(mockClient.release).toHaveBeenCalledTimes(1);

    await expect(
      withActor('user-123', async () => {
        throw new Error('tx failure');
      }),
    ).rejects.toThrow('tx failure');
    expect(queries).toContain('ROLLBACK');
    expect(mockClient.release).toHaveBeenCalledTimes(2);

    await closePool();
    await closePool(); // idempotent second call
    expect(endSpy).toHaveBeenCalledTimes(1);

    connectSpy.mockRestore();
    endSpy.mockRestore();
  });
});
