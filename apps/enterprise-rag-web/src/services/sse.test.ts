import { describe, expect, it } from 'vitest';
import { SseDecoder } from './sse';

describe('Authenticated SSE framing', () => {
  it('handles a message split over TCP chunks', () => {
    const decoder = new SseDecoder();
    expect(decoder.push('event: status\ndata: {"phase":')).toEqual([]);
    expect(decoder.push('"retrieval"}\n\n')).toEqual([{ event: 'status', data: { phase: 'retrieval' } }]);
  });

  it('handles CRLF split across chunk boundaries without leaving dangling CR', () => {
    const decoder = new SseDecoder();
    expect(decoder.push('event: status\r\ndata: {"phase":"authorized"}\r')).toEqual([]);
    expect(decoder.push('\n\r\n')).toEqual([{ event: 'status', data: { phase: 'authorized' } }]);
  });

  it('handles multiple events per frame chunk', () => {
    const decoder = new SseDecoder();
    expect(
      decoder.push(
        'event: status\ndata: {"phase":"generation"}\n\nevent: complete\ndata: {"answer":"ok"}\n\n',
      ),
    ).toHaveLength(2);
  });

  it('rejects giant or malformed JSON event', () => {
    expect(() => new SseDecoder().push('x'.repeat(70000))).toThrow();
    expect(() => new SseDecoder().push('data: {invalid}\n\n')).toThrow();
  });
});
