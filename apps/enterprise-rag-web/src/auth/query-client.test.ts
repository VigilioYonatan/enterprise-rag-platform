import { describe, expect, it, vi } from 'vitest';
import { queryClient, resetSessionQueryCache } from './query-client';

describe('TanStack Query session isolation', () => {
  it('clears query cache on resetSessionQueryCache', () => {
    const clearSpy = vi.spyOn(queryClient, 'clear');
    resetSessionQueryCache();
    expect(clearSpy).toHaveBeenCalledTimes(1);
  });
});
