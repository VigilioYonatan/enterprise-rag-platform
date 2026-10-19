import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  ensurePrivateBucket,
  promoteQuarantineObject,
  removePrivateObject,
  retrievePrivateObject,
  type S3ConnectionConfig,
  storePrivateObject,
} from '../../src/storage/object-storage';

describe('RustFS S3 Signature V4 pure Node adapter', () => {
  const buckets = new Set<string>();
  const objects = new Map<string, { body: Buffer; contentType: string }>();
  const seenAuthHeaders: string[] = [];
  let port = 0;
  let server: ReturnType<typeof createServer>;

  beforeAll(async () => {
    server = createServer((req: IncomingMessage, res: ServerResponse) => {
      const chunks: Buffer[] = [];
      req.on('data', (c: Buffer) => chunks.push(c));
      req.on('end', () => {
        const auth = req.headers.authorization ?? '';
        seenAuthHeaders.push(auth);
        if (!auth.startsWith('AWS4-HMAC-SHA256 Credential=test-access/')) {
          res.writeHead(403).end('Invalid signature header');
          return;
        }
        const url = new URL(req.url ?? '/', 'http://127.0.0.1');
        const parts = url.pathname.split('/').filter(Boolean).map(decodeURIComponent);
        const bucket = parts[0];
        const key = parts.slice(1).join('/');

        if (!key) {
          if (req.method === 'HEAD') {
            res.writeHead(buckets.has(bucket) ? 200 : 404).end();
            return;
          }
          if (req.method === 'PUT') {
            buckets.add(bucket);
            res.writeHead(200).end();
            return;
          }
        }

        const fullKey = `${bucket}/${key}`;
        if (req.method === 'PUT') {
          const copySource = req.headers['x-amz-copy-source'];
          if (typeof copySource === 'string') {
            const normalizedSource = copySource
              .replace(/^\//, '')
              .split('/')
              .map(decodeURIComponent)
              .join('/');
            const srcObj = objects.get(normalizedSource);
            if (!srcObj) {
              res.writeHead(404).end();
              return;
            }
            objects.set(fullKey, { body: Buffer.from(srcObj.body), contentType: srcObj.contentType });
            res.writeHead(200, { 'Content-Type': 'application/xml' }).end('<CopyObjectResult/>');
            return;
          }
          objects.set(fullKey, {
            body: Buffer.concat(chunks),
            contentType: String(req.headers['content-type'] ?? 'application/octet-stream'),
          });
          res.writeHead(200).end();
          return;
        }
        if (req.method === 'GET') {
          const found = objects.get(fullKey);
          if (!found) {
            res.writeHead(404).end();
            return;
          }
          res.writeHead(200, { 'Content-Type': found.contentType }).end(found.body);
          return;
        }
        if (req.method === 'DELETE') {
          objects.delete(fullKey);
          res.writeHead(204).end();
          return;
        }
        res.writeHead(405).end();
      });
    });

    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
    port = (server.address() as AddressInfo).port;
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
  });

  it('creates bucket idempotently, stores, retrieves, promotes quarantine->clean and deletes with SigV4', async () => {
    const cfg: S3ConnectionConfig = {
      host: '127.0.0.1',
      port,
      ssl: false,
      region: 'us-east-1',
      access_key: 'test-access',
      secret_key: 'test-secret-key',
      bucket: 'rag-documents',
    };

    await ensurePrivateBucket(cfg);
    await ensurePrivateBucket(cfg);
    expect(buckets.has('rag-documents')).toBe(true);

    const payload = Buffer.from('Contenido confidencial en RustFS con UTF-8 áéíóú');
    await storePrivateObject('quarantine/obj-1', payload, 'text/plain', cfg);
    const fetched = await retrievePrivateObject('quarantine/obj-1', cfg);
    expect(fetched.equals(payload)).toBe(true);

    await promoteQuarantineObject('quarantine/obj-1', 'clean/obj-1', cfg);
    const cleanPayload = await retrievePrivateObject('clean/obj-1', cfg);
    expect(cleanPayload.equals(payload)).toBe(true);
    await expect(retrievePrivateObject('quarantine/obj-1', cfg)).rejects.toThrow('Private object not found');

    await removePrivateObject('clean/obj-1', cfg);
    await removePrivateObject('clean/obj-1', cfg);
    expect(seenAuthHeaders.every((h) => h.includes('AWS4-HMAC-SHA256'))).toBe(true);
  });
});
