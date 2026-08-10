import { once } from 'node:events';
import { connect, type Socket } from 'node:net';

export class MalwareDetectedError extends Error {
  readonly signature: string;

  constructor(signature: string) {
    super(`Malware detected by ClamAV: ${signature}`);
    this.name = 'MalwareDetectedError';
    this.signature = signature;
  }
}

async function writeChunkWithBackpressure(socket: Socket, chunk: Buffer | string): Promise<void> {
  if (!socket.write(chunk)) {
    await once(socket, 'drain');
  }
}

/** ClamAV INSTREAM protocol. Fail closed on timeout, parse errors or unavailable scanner. */
export async function scanClamav(content: Buffer, host: string, port = 3310): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const socket: Socket = connect({ host, port });
    let result = '';
    let done = false;

    const finish = (error?: Error) => {
      if (done) return;
      done = true;
      socket.destroy();
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    };

    socket.setTimeout(30_000, () => finish(new Error('Antivirus scan timed out')));
    socket.once('error', (error) => finish(error));

    socket.on('data', (data) => {
      result += data.toString('utf8');
      if (result.includes('\0') || result.includes('\n')) {
        const trimmed = result.replace(/\0/g, '').trim();
        if (/stream:\s*OK$/i.test(trimmed)) {
          finish();
          return;
        }
        const foundMatch = /stream:\s*(.+?)\s+FOUND$/i.exec(trimmed);
        if (foundMatch) {
          finish(new MalwareDetectedError(foundMatch[1]));
          return;
        }
        finish(new Error(`Antivirus scan rejected file: ${trimmed.slice(0, 120)}`));
      }
    });

    socket.once('connect', () => {
      void (async () => {
        try {
          await writeChunkWithBackpressure(socket, 'zINSTREAM\0');
          for (let offset = 0; offset < content.length; offset += 65_536) {
            const segment = content.subarray(offset, offset + 65_536);
            const size = Buffer.allocUnsafe(4);
            size.writeUInt32BE(segment.length, 0);
            await writeChunkWithBackpressure(socket, size);
            await writeChunkWithBackpressure(socket, segment);
          }
          await writeChunkWithBackpressure(socket, Buffer.alloc(4));
        } catch (err) {
          finish(err instanceof Error ? err : new Error('Failed writing stream to ClamAV'));
        }
      })();
    });
  });
}
