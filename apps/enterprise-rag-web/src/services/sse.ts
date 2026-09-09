/** Incremental, bounded SSE framing; does not evaluate arbitrary data. */
export interface SseFrame {
  event: string;
  data: unknown;
}

export class SseDecoder {
  private remainder = '';
  private readonly limit = 65536;

  push(text: string): SseFrame[] {
    this.remainder = (this.remainder + text).replace(/\r\n/g, '\n');
    if (this.remainder.length > this.limit) {
      throw new Error('SSE frame exceeded size limit');
    }

    const frames: SseFrame[] = [];
    for (;;) {
      const end = this.remainder.indexOf('\n\n');
      if (end < 0) break;
      const raw = this.remainder.slice(0, end);
      this.remainder = this.remainder.slice(end + 2);
      let event = 'message';
      const data: string[] = [];
      for (const line of raw.split('\n')) {
        if (line.startsWith('event:')) event = line.slice(6).trim();
        if (line.startsWith('data:')) data.push(line.slice(5).trimStart());
      }
      if (!data.length) continue;
      try {
        frames.push({ event, data: JSON.parse(data.join('\n')) });
      } catch {
        throw new Error('Invalid server event payload');
      }
    }
    return frames;
  }
}
