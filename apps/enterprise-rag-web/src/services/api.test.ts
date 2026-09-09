import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const oidcMocks = vi.hoisted(() => ({
  getUser: vi.fn(),
}));

vi.mock('../auth/oidc', () => ({
  userManager: {
    getUser: () => oidcMocks.getUser(),
  },
}));

import {
  type ApiError,
  api,
  apiList,
  apiPaginated,
  downloadDocument,
  streamAnswer,
  streamConversationMessage,
} from './api';

describe('API client & Vigilio pagination / SSE contract', () => {
  beforeEach(() => {
    oidcMocks.getUser.mockResolvedValue({
      expired: false,
      access_token: 'jwt-test-token',
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('unwraps Vigilio paginated envelopes in apiPaginated and apiList', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(
      async () =>
        new Response(
          JSON.stringify({
            count: 2,
            next: '/api/v1/tenants?limit=1&offset=1',
            previous: null,
            results: [{ id: 't1', name: 'Org Uno' }],
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        ),
    );

    const page = await apiPaginated<{ id: string; name: string }>('/tenants');
    expect(page.count).toBe(2);
    expect(page.results).toEqual([{ id: 't1', name: 'Org Uno' }]);

    const list = await apiList<{ id: string; name: string }>('/tenants');
    expect(list).toEqual([{ id: 't1', name: 'Org Uno' }]);
  });

  it('handles direct array payload in apiPaginated cleanly', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(
      async () =>
        new Response(JSON.stringify([{ id: 'item-1' }, { id: 'item-2' }]), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
    );

    const page = await apiPaginated<{ id: string }>('/items');
    expect(page.count).toBe(2);
    expect(page.results).toEqual([{ id: 'item-1' }, { id: 'item-2' }]);
  });

  it('handles 204 No Content response in api call', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => new Response(null, { status: 204 }));

    const result = await api<void>('/resource/1', { method: 'DELETE' });
    expect(result).toBeUndefined();
  });

  it('surfaces BUDGET_EXHAUSTED 429 JSON error code cleanly in Spanish', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          code: 'BUDGET_EXHAUSTED',
          message: 'Daily tenant budget exhausted',
        }),
        { status: 429, headers: { 'content-type': 'application/json' } },
      ),
    );

    await expect(api('/answers', { method: 'POST', body: '{}' })).rejects.toMatchObject({
      name: 'ApiError',
      status: 429,
      code: 'BUDGET_EXHAUSTED',
      message: 'Se agotó el presupuesto diario de consultas de la organización.',
    } satisfies Partial<ApiError>);
  });

  it('streams SSE events with Bearer header and flushes UTF-8 multibyte chunks', async () => {
    const encoder = new TextEncoder();
    const fullBytes = encoder.encode(
      'event: status\ndata: {"phase":"authorized"}\n\nevent: complete\ndata: {"answer":"Política válida","citations":[],"abstained":false}\n\n',
    );
    // Split right inside the multibyte 'í' character
    const part1 = fullBytes.slice(0, 74);
    const part2 = fullBytes.slice(74);

    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(part1);
        controller.enqueue(part2);
        controller.close();
      },
    });

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(stream, {
        status: 200,
        headers: { 'content-type': 'text/event-stream' },
      }),
    );

    const events: string[] = [];
    let finalAnswer = '';
    await streamAnswer(
      { knowledge_base_id: '11111111-1111-4111-8111-111111111111', question: '¿Política?' },
      new AbortController().signal,
      (frame) => {
        events.push(frame.event);
        if (frame.event === 'complete') {
          finalAnswer = (frame.data as { answer: string }).answer;
        }
      },
    );

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(events).toEqual(['status', 'complete']);
    expect(finalAnswer).toBe('Política válida');
  });

  it('streams conversation message turns via streamConversationMessage', async () => {
    const encoder = new TextEncoder();
    const bytes = encoder.encode('event: token\ndata: {"text":"Hola"}\n\nevent: complete\ndata: {}\n\n');
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(bytes);
        controller.close();
      },
    });

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(stream, {
        status: 200,
        headers: { 'content-type': 'text/event-stream' },
      }),
    );

    const frames: string[] = [];
    await streamConversationMessage('conv-1', '¿Hola?', new AbortController().signal, (f) => {
      frames.push(f.event);
    });
    expect(frames).toEqual(['token', 'complete']);
  });

  it('downloads document blob and triggers anchor click', async () => {
    const blob = new Blob(['sample pdf bytes'], { type: 'application/pdf' });
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(blob, {
        status: 200,
        headers: {
          'content-type': 'application/pdf',
        },
      }),
    );

    const createObjectURLMock = vi.fn().mockReturnValue('blob:http://localhost/mock-uuid');
    const revokeObjectURLMock = vi.fn();
    globalThis.URL.createObjectURL = createObjectURLMock;
    globalThis.URL.revokeObjectURL = revokeObjectURLMock;

    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    await downloadDocument('doc-123', 'manual.pdf');
    expect(createObjectURLMock).toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalled();
  });

  it('handles expired sessions, HTTP error statuses, invalid paginated payloads, and SSE error/truncation frames', async () => {
    oidcMocks.getUser.mockResolvedValueOnce({ expired: true, access_token: 'old' });
    await expect(api('/me')).rejects.toMatchObject({ status: 401, code: 'SESSION_EXPIRED' });

    for (const status of [400, 403, 404, 409, 503, 500]) {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response('plain failure', { status, headers: { 'content-type': 'text/plain' } }),
      );
      await expect(api('/fail')).rejects.toMatchObject({ status });
    }

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ message: ['Campo requerido', 'UUID inválido'] }), {
        status: 400,
        headers: { 'content-type': 'application/json' },
      }),
    );
    await expect(api('/bad')).rejects.toThrow('Campo requerido · UUID inválido');

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ unexpected: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
    await expect(apiPaginated('/weird')).rejects.toMatchObject({ status: 500 });

    // SSE error frame with BUDGET_EXHAUSTED
    const encoder = new TextEncoder();
    const errStream = new ReadableStream<Uint8Array>({
      start(c) {
        c.enqueue(encoder.encode('event: error\ndata: {"code":"BUDGET_EXHAUSTED"}\n\n'));
        c.close();
      },
    });
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(errStream, { status: 200, headers: { 'content-type': 'text/event-stream' } }),
    );
    await expect(
      streamAnswer({ knowledge_base_id: 'kb1', question: 'Q?' }, new AbortController().signal, () => {}),
    ).rejects.toThrow(/presupuesto diario/i);

    // SSE stream closed without complete event
    const truncatedStream = new ReadableStream<Uint8Array>({
      start(c) {
        c.enqueue(encoder.encode('event: status\ndata: {"phase":"authorized"}\n\n'));
        c.close();
      },
    });
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(truncatedStream, { status: 200, headers: { 'content-type': 'text/event-stream' } }),
    );
    await expect(
      streamAnswer({ knowledge_base_id: 'kb1', question: 'Q?' }, new AbortController().signal, () => {}),
    ).rejects.toThrow(/antes de completar/i);
  });
});
