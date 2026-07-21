import { createHash, createHmac } from 'node:crypto';
import { env } from '../config/env';
import { MAX_UPLOAD_BYTES } from '../modules/uploads/const/uploads.const';

/**
 * Cloud-neutral S3 Signature V4 adapter targeting self-hosted RustFS (or any S3-compatible store).
 * Zero AWS SDK dependencies; keys are server-generated and buckets remain strictly private.
 */

export interface S3ConnectionConfig {
  host: string;
  port: number;
  ssl: boolean;
  region: string;
  bucket: string;
  access_key: string;
  secret_key: string;
}

function defaultConfig(): S3ConnectionConfig {
  return {
    host: env.OBJECT_STORAGE_HOST,
    port: env.OBJECT_STORAGE_PORT,
    ssl: env.OBJECT_STORAGE_SSL,
    region: env.OBJECT_STORAGE_REGION,
    bucket: env.OBJECT_STORAGE_BUCKET,
    access_key: env.OBJECT_STORAGE_ACCESS_KEY,
    secret_key: env.OBJECT_STORAGE_SECRET_KEY,
  };
}

function sha256Hex(payload: Buffer | string): string {
  return createHash('sha256').update(payload).digest('hex');
}

function hmac(key: Buffer | string, data: string): Buffer {
  return createHmac('sha256', key).update(data, 'utf8').digest();
}

function encodeS3Path(raw_path: string): string {
  return raw_path
    .split('/')
    .map((segment) =>
      encodeURIComponent(segment).replace(
        /[!'()*]/g,
        (ch) => `%${ch.charCodeAt(0).toString(16).toUpperCase()}`,
      ),
    )
    .join('/');
}

function signS3Request(
  method: string,
  canonical_uri: string,
  payload_hash: string,
  extra_headers: Record<string, string>,
  cfg: S3ConnectionConfig,
): { url: string; headers: Record<string, string> } {
  const now = new Date();
  const amz_date = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const date_stamp = amz_date.slice(0, 8);
  const default_port = cfg.ssl ? 443 : 80;
  const host_header = cfg.port === default_port ? cfg.host : `${cfg.host}:${cfg.port}`;
  const protocol = cfg.ssl ? 'https' : 'http';

  const normalized: Record<string, string> = {
    host: host_header,
    'x-amz-content-sha256': payload_hash,
    'x-amz-date': amz_date,
  };
  for (const [k, v] of Object.entries(extra_headers)) {
    normalized[k.toLowerCase()] = v.trim();
  }

  const sorted_keys = Object.keys(normalized).sort();
  const canonical_headers = sorted_keys.map((k) => `${k}:${normalized[k]}\n`).join('');
  const signed_headers = sorted_keys.join(';');
  const canonical_request = [
    method.toUpperCase(),
    canonical_uri,
    '',
    canonical_headers,
    signed_headers,
    payload_hash,
  ].join('\n');

  const credential_scope = `${date_stamp}/${cfg.region}/s3/aws4_request`;
  const string_to_sign = ['AWS4-HMAC-SHA256', amz_date, credential_scope, sha256Hex(canonical_request)].join(
    '\n',
  );

  const k_date = hmac(`AWS4${cfg.secret_key}`, date_stamp);
  const k_region = hmac(k_date, cfg.region);
  const k_service = hmac(k_region, 's3');
  const k_signing = hmac(k_service, 'aws4_request');
  const signature = createHmac('sha256', k_signing).update(string_to_sign, 'utf8').digest('hex');

  const headers: Record<string, string> = {
    ...extra_headers,
    'x-amz-content-sha256': payload_hash,
    'x-amz-date': amz_date,
    Authorization: `AWS4-HMAC-SHA256 Credential=${cfg.access_key}/${credential_scope}, SignedHeaders=${signed_headers}, Signature=${signature}`,
  };
  return {
    url: `${protocol}://${host_header}${canonical_uri}`,
    headers,
  };
}

export async function ensurePrivateBucket(custom_cfg?: S3ConnectionConfig): Promise<void> {
  const cfg = custom_cfg ?? defaultConfig();
  const uri = `/${encodeS3Path(cfg.bucket)}`;
  const empty_hash = sha256Hex('');
  const head_req = signS3Request('HEAD', uri, empty_hash, {}, cfg);
  const head_res = await fetch(head_req.url, {
    method: 'HEAD',
    headers: head_req.headers,
    signal: AbortSignal.timeout(15_000),
  });
  if (head_res.status === 200) {
    return;
  }
  if (head_res.status !== 404) {
    throw new Error(`Object storage bucket check failed with HTTP ${head_res.status}`);
  }
  const put_req = signS3Request('PUT', uri, empty_hash, {}, cfg);
  const put_res = await fetch(put_req.url, {
    method: 'PUT',
    headers: put_req.headers,
    signal: AbortSignal.timeout(15_000),
  });
  if (!put_res.ok && put_res.status !== 409) {
    throw new Error(`Object storage bucket creation failed with HTTP ${put_res.status}`);
  }
}

export async function storePrivateObject(
  key: string,
  payload: Buffer,
  mime: string,
  custom_cfg?: S3ConnectionConfig,
): Promise<void> {
  if (payload.length < 1 || payload.length > MAX_UPLOAD_BYTES) {
    throw new Error('Invalid object size');
  }
  const cfg = custom_cfg ?? defaultConfig();
  const uri = `/${encodeS3Path(cfg.bucket)}/${encodeS3Path(key)}`;
  const payload_hash = sha256Hex(payload);
  const signed = signS3Request(
    'PUT',
    uri,
    payload_hash,
    {
      'Content-Type': mime || 'application/octet-stream',
      'Content-Length': String(payload.length),
    },
    cfg,
  );
  const response = await fetch(signed.url, {
    method: 'PUT',
    headers: signed.headers,
    body: new Uint8Array(payload),
    signal: AbortSignal.timeout(60_000),
  });
  if (!response.ok) {
    if (response.status === 404) {
      await ensurePrivateBucket(cfg);
      const retry_signed = signS3Request(
        'PUT',
        uri,
        payload_hash,
        {
          'Content-Type': mime || 'application/octet-stream',
          'Content-Length': String(payload.length),
        },
        cfg,
      );
      const retry_res = await fetch(retry_signed.url, {
        method: 'PUT',
        headers: retry_signed.headers,
        body: new Uint8Array(payload),
        signal: AbortSignal.timeout(60_000),
      });
      if (retry_res.ok) return;
    }
    throw new Error(`Object storage upload failed with HTTP ${response.status}`);
  }
}

export async function retrievePrivateObject(key: string, custom_cfg?: S3ConnectionConfig): Promise<Buffer> {
  const cfg = custom_cfg ?? defaultConfig();
  const uri = `/${encodeS3Path(cfg.bucket)}/${encodeS3Path(key)}`;
  const signed = signS3Request('GET', uri, sha256Hex(''), {}, cfg);
  const response = await fetch(signed.url, {
    method: 'GET',
    headers: signed.headers,
    signal: AbortSignal.timeout(60_000),
  });
  if (response.status === 404) {
    throw new Error('Private object not found');
  }
  if (!response.ok || !response.body) {
    throw new Error(`Object storage retrieval failed with HTTP ${response.status}`);
  }
  const reader = response.body.getReader();
  const segments: Buffer[] = [];
  let bytes = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      const chunk = Buffer.from(value);
      bytes += chunk.length;
      if (bytes > MAX_UPLOAD_BYTES) {
        await reader.cancel('Object exceeds ingestion limit');
        throw new Error('Object exceeds ingestion limit');
      }
      segments.push(chunk);
    }
  } finally {
    reader.releaseLock();
  }
  return Buffer.concat(segments);
}

export async function promoteQuarantineObject(
  quarantine_key: string,
  clean_key: string,
  custom_cfg?: S3ConnectionConfig,
): Promise<void> {
  const cfg = custom_cfg ?? defaultConfig();
  const dest_uri = `/${encodeS3Path(cfg.bucket)}/${encodeS3Path(clean_key)}`;
  const copy_source = `/${encodeS3Path(cfg.bucket)}/${encodeS3Path(quarantine_key)}`;
  const signed = signS3Request('PUT', dest_uri, sha256Hex(''), { 'x-amz-copy-source': copy_source }, cfg);
  const response = await fetch(signed.url, {
    method: 'PUT',
    headers: signed.headers,
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) {
    throw new Error(`Object promotion failed with HTTP ${response.status}`);
  }
  await removePrivateObject(quarantine_key, cfg);
}

export async function removePrivateObject(key: string, custom_cfg?: S3ConnectionConfig): Promise<void> {
  const cfg = custom_cfg ?? defaultConfig();
  const uri = `/${encodeS3Path(cfg.bucket)}/${encodeS3Path(key)}`;
  const signed = signS3Request('DELETE', uri, sha256Hex(''), {}, cfg);
  const response = await fetch(signed.url, {
    method: 'DELETE',
    headers: signed.headers,
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok && response.status !== 404) {
    throw new Error(`Object deletion failed with HTTP ${response.status}`);
  }
}
