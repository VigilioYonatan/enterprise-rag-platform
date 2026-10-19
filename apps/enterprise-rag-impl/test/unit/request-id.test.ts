import { describe, expect, it } from 'vitest';
import { requestIdMiddleware } from '../../src/observability/request-id.middleware';

function invoke(external?: string) {
  const headers: Record<string, string> = {};
  const req = { header: () => external } as never;
  const res = {
    locals: {} as Record<string, string>,
    setHeader: (k: string, v: string) => {
      headers[k] = v;
    },
  } as never;
  let called = 0;
  requestIdMiddleware(req, res, () => {
    called++;
  });
  return { headers, locals: (res as { locals: Record<string, string> }).locals, called };
}
describe('request correlation privacy', () => {
  it('generates an opaque ID when missing', () => {
    const result = invoke();
    expect(result.called).toBe(1);
    expect(result.headers['X-Request-Id']).toMatch(/^[0-9a-f-]{36}$/);
  });
  it('accepts a valid bounded external correlation ID', () =>
    expect(invoke('request_12345678').headers['X-Request-Id']).toBe('request_12345678'));
  it('rejects CRLF injection and unusually long identifiers', () => {
    expect(invoke('invalid\r\nX-Admin: true').headers['X-Request-Id']).not.toContain('invalid');
    expect(invoke('x'.repeat(300)).headers['X-Request-Id']).toHaveLength(36);
  });
});
