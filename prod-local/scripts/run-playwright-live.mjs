#!/usr/bin/env node
/**
 * Vigilio Super Senior Mode — Complete DDD Seed + 12-Page Live Playwright Browser E2E Runner
 *
 * 1. Executes `pnpm --dir apps/enterprise-rag-impl db:seed:local` idempotently against PostgreSQL 17
 *    (`rag_app` + `rag_worker`), Keycloak 26 (`owner.demo@atlas.local`, `admin.demo@atlas.local`,
 *    `viewer.demo@atlas.local`), and Ollama (`qwen3-embedding:0.6b` 1024d).
 * 2. Provisions isolated ephemeral Keycloak 26 OIDC actors per browser project (`chromium` &
 *    `mobile-chrome` `Pixel 7`) plus an ephemeral peer user (zero hardcoded credentials).
 * 3. Spawns NestJS API + Outbox Relay + Valkey BullMQ Worker + SPA/SSE Reverse Proxy Gateway (`18080`).
 * 4. Runs Playwright E2E across all 12 routes, form validations, modals, drawers, ClamAV uploads & SSE RAG.
 */

import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { existsSync, readFileSync, rmSync, statSync } from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');
const implDir = path.join(rootDir, 'apps/enterprise-rag-impl');
const webDir = path.join(rootDir, 'apps/enterprise-rag-web');
const webDistDir = path.join(webDir, 'dist');

function requireEnv(name) {
  const value = process.env[name];
  if (!value || !value.trim()) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value.trim();
}

const DATABASE_URL = requireEnv('DATABASE_URL');
const WORKER_DATABASE_URL = requireEnv('WORKER_DATABASE_URL');
const KEYCLOAK_ADMIN_USER = requireEnv('KEYCLOAK_ADMIN_USER');
const KEYCLOAK_ADMIN_PASSWORD = requireEnv('KEYCLOAK_ADMIN_PASSWORD');
const OBJECT_STORAGE_ACCESS_KEY = requireEnv('OBJECT_STORAGE_ACCESS_KEY');
const OBJECT_STORAGE_SECRET_KEY = requireEnv('OBJECT_STORAGE_SECRET_KEY');
const VALKEY_PASSWORD = requireEnv('VALKEY_PASSWORD');

const GATEWAY_PORT = Number(process.env.E2E_GATEWAY_PORT || '18080');
const API_PORT = Number(process.env.E2E_API_PORT || '13004');
const WEB_ORIGIN = `http://localhost:${GATEWAY_PORT}`;
const REDIRECT_URI = `${WEB_ORIGIN}/auth/callback`;
const KEYCLOAK_URL = (process.env.KEYCLOAK_URL || 'http://localhost:18081').replace(/\/$/, '');
const KEYCLOAK_REALM = process.env.KEYCLOAK_REALM || 'enterprise';
const OIDC_CLIENT_ID = process.env.OIDC_CLIENT_ID || 'enterprise-rag-web';
const OIDC_ISSUER = `${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}`;
const OIDC_JWKS_URL = `${OIDC_ISSUER}/protocol/openid-connect/certs`;
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://127.0.0.1:11434';

if (!existsSync(path.join(webDistDir, 'index.html'))) {
  throw new Error('Missing apps/enterprise-rag-web/dist/index.html — run pnpm --dir apps/enterprise-rag-web build first');
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const tsxCli = path.join(implDir, 'node_modules/tsx/dist/cli.mjs');
const playwrightCli = path.join(webDir, 'node_modules/@playwright/test/cli.js');

function generateEphemeralPassword() {
  return `Vg_${randomBytes(9).toString('base64url')}9!Aa`;
}

// 1. Run Complete Idempotent DDD Seeder (`db:seed:local`) with ephemeral demo password
const seedDemoPassword = generateEphemeralPassword();
console.log('[1/4] Executing complete DDD Seeder (db:seed:local) against PostgreSQL, Keycloak & Ollama...');
await new Promise((resolve, reject) => {
  const seedProc = spawn(process.execPath, [tsxCli, 'src/scripts/seed-local-db.ts'], {
    cwd: implDir,
    env: {
      ...process.env,
      NODE_ENV: 'development',
      DATABASE_URL,
      WORKER_DATABASE_URL,
      OIDC_ISSUER,
      OIDC_JWKS_URL,
      OBJECT_STORAGE_ACCESS_KEY,
      OBJECT_STORAGE_SECRET_KEY,
      OBJECT_STORAGE_HOST: process.env.OBJECT_STORAGE_HOST || 'localhost',
      VALKEY_PASSWORD,
      SEED_KEYCLOAK_URL: KEYCLOAK_URL,
      SEED_KEYCLOAK_REALM: KEYCLOAK_REALM,
      SEED_KEYCLOAK_ADMIN_USER: KEYCLOAK_ADMIN_USER,
      SEED_KEYCLOAK_ADMIN_PASSWORD: KEYCLOAK_ADMIN_PASSWORD,
      SEED_DEMO_USER_PASSWORD: seedDemoPassword,
      OLLAMA_URL,
      OLLAMA_EMBED_MODEL: 'qwen3-embedding:0.6b',
      EMBEDDINGS_ENABLED: 'true',
      EMBEDDING_DIMENSIONS: '1024',
    },
    stdio: 'inherit',
  });
  seedProc.on('exit', (code) =>
    code === 0 ? resolve() : reject(new Error(`db:seed:local exited with code ${code}`)),
  );
});

// 2. Provision isolated Keycloak OIDC actors per browser project + peer user
console.log('[2/4] Provisioning isolated Keycloak 26 OIDC PKCE browser actors...');
const tokenRes = await fetch(`${KEYCLOAK_URL}/realms/master/protocol/openid-connect/token`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({
    grant_type: 'password',
    client_id: 'admin-cli',
    username: KEYCLOAK_ADMIN_USER,
    password: KEYCLOAK_ADMIN_PASSWORD,
  }),
});
assert.equal(tokenRes.ok, true, `Keycloak admin login failed: HTTP ${tokenRes.status}`);
const kcAdminToken = (await tokenRes.json()).access_token;

const clientsRes = await fetch(
  `${KEYCLOAK_URL}/admin/realms/${KEYCLOAK_REALM}/clients?clientId=${encodeURIComponent(OIDC_CLIENT_ID)}`,
  { headers: { Authorization: `Bearer ${kcAdminToken}` } },
);
const [client] = await clientsRes.json();
await fetch(`${KEYCLOAK_URL}/admin/realms/${KEYCLOAK_REALM}/clients/${client.id}`, {
  method: 'PUT',
  headers: { Authorization: `Bearer ${kcAdminToken}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    ...client,
    redirectUris: Array.from(new Set([...(client.redirectUris || []), REDIRECT_URI])),
    webOrigins: Array.from(new Set([...(client.webOrigins || []), WEB_ORIGIN])),
    attributes: {
      ...(client.attributes || {}),
      'post.logout.redirect.uris': `${WEB_ORIGIN}/*##${WEB_ORIGIN}/##http://localhost:8080/*##http://localhost:8080/`,
    },
  }),
});

async function createEphemeralKeycloakUser(email, lastName) {
  const password = generateEphemeralPassword();
  const res = await fetch(`${KEYCLOAK_URL}/admin/realms/${KEYCLOAK_REALM}/users`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${kcAdminToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: email,
      email,
      firstName: 'Vigilio',
      lastName,
      enabled: true,
      emailVerified: true,
      requiredActions: [],
      credentials: [{ type: 'password', value: password, temporary: false }],
    }),
  });
  assert.equal(res.status, 201, `Failed creating Keycloak user ${email}: HTTP ${res.status}`);
  return { email, password };
}

async function exchangePkceAccessToken({ email, password }) {
  const verifier = randomBytes(32).toString('base64url');
  const challenge = createHash('sha256').update(verifier).digest('base64url');
  const state = randomBytes(16).toString('hex');
  const authParams = new URLSearchParams({
    client_id: OIDC_CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: 'openid profile email',
    state,
    code_challenge: challenge,
    code_challenge_method: 'S256',
  });
  const authPageRes = await fetch(`${OIDC_ISSUER}/protocol/openid-connect/auth?${authParams.toString()}`, {
    redirect: 'manual',
  });
  const cookies = authPageRes.headers
    .getSetCookie()
    .map((raw) => raw.split(';')[0])
    .join('; ');
  const html = await authPageRes.text();
  const actionMatch = html.match(/<form[^>]*id="kc-form-login"[^>]*action="([^"]+)"/i);
  assert.ok(actionMatch, 'Could not find kc-form-login action URL');
  const submitRes = await fetch(actionMatch[1].replaceAll('&amp;', '&'), {
    method: 'POST',
    redirect: 'manual',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Cookie: cookies },
    body: new URLSearchParams({ username: email, password, credentialId: '' }),
  });
  assert.equal(submitRes.status, 302, `Expected 302 from Keycloak PKCE login, got ${submitRes.status}`);
  const code = new URL(submitRes.headers.get('location') || '').searchParams.get('code');
  assert.ok(code, 'Missing authorization code from Keycloak');
  const tokRes = await fetch(`${OIDC_ISSUER}/protocol/openid-connect/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: OIDC_CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      code,
      code_verifier: verifier,
    }),
  });
  assert.equal(tokRes.status, 200, `PKCE token exchange failed: HTTP ${tokRes.status}`);
  return (await tokRes.json()).access_token;
}

const runTag = randomUUID().slice(0, 8);
const chromiumActor = await createEphemeralKeycloakUser(`browser.chr.${runTag}@atlas.local`, 'ChromiumE2E');
const mobileActor = await createEphemeralKeycloakUser(`browser.mob.${runTag}@atlas.local`, 'MobileE2E');
const peerActor = await createEphemeralKeycloakUser(`peer.${runTag}@atlas.local`, 'PeerMember');

// 3. Spawn Backend API + Outbox Relay + BullMQ Worker + Reverse Proxy Gateway
console.log(`[3/4] Starting NestJS API, Outbox Relay, BullMQ Worker, and SPA Gateway on ${WEB_ORIGIN}...`);
const runtimeEnv = {
  ...process.env,
  NODE_ENV: 'production',
  PORT: String(API_PORT),
  WEB_ORIGIN,
  DATABASE_URL,
  WORKER_DATABASE_URL,
  OIDC_ISSUER,
  OIDC_JWKS_URL,
  OIDC_AUDIENCE: 'enterprise-rag-api',
  OIDC_CLIENT_ID,
  LOG_LEVEL: 'warn',
  OLLAMA_URL,
  OLLAMA_EMBED_MODEL: 'qwen3-embedding:0.6b',
  OLLAMA_GENERATION_MODEL: 'qwen2.5:3b',
  EMBEDDINGS_ENABLED: 'true',
  EMBEDDING_DIMENSIONS: '1024',
  MIN_VECTOR_SIMILARITY: '0.20',
  RERANKER_ENABLED: 'false',
  OBJECT_STORAGE_HOST: process.env.OBJECT_STORAGE_HOST || 'localhost',
  OBJECT_STORAGE_PORT: process.env.OBJECT_STORAGE_PORT || '9000',
  OBJECT_STORAGE_SSL: 'false',
  OBJECT_STORAGE_BUCKET: process.env.OBJECT_STORAGE_BUCKET || 'rag-documents',
  OBJECT_STORAGE_ACCESS_KEY,
  OBJECT_STORAGE_SECRET_KEY,
  VALKEY_URL: process.env.VALKEY_URL || 'redis://127.0.0.1:6379',
  VALKEY_PASSWORD,
  QUEUE_MODE: 'bullmq',
  CLAMAV_REQUIRED: 'true',
  CLAMAV_HOST: process.env.CLAMAV_HOST || '127.0.0.1',
  CLAMAV_PORT: process.env.CLAMAV_PORT || '3310',
};

const children = [
  spawn('node', ['dist/main.js'], { cwd: implDir, env: runtimeEnv, stdio: 'ignore' }),
  spawn('node', ['dist/outbox/main.js'], {
    cwd: implDir,
    env: { ...runtimeEnv, DATABASE_URL: WORKER_DATABASE_URL },
    stdio: 'ignore',
  }),
  spawn('node', ['dist/worker/main.js'], {
    cwd: implDir,
    env: { ...runtimeEnv, DATABASE_URL: WORKER_DATABASE_URL },
    stdio: 'ignore',
  }),
];

const configJsBody = `window.__APP_CONFIG__ = ${JSON.stringify({
  apiBase: '/api/v1',
  oidcAuthority: OIDC_ISSUER,
  oidcClientId: OIDC_CLIENT_ID,
  googleEnabled: false,
  facebookEnabled: false,
})};\n`;

const gateway = http.createServer((req, res) => {
  const urlPath = (req.url || '/').split('?')[0];
  if (urlPath === '/config.js') {
    res.writeHead(200, { 'Content-Type': 'application/javascript; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end(configJsBody);
    return;
  }

  if (urlPath.startsWith('/api/') || urlPath === '/metrics') {
    const upstream = http.request(
      {
        hostname: '127.0.0.1',
        port: API_PORT,
        path: req.url,
        method: req.method,
        headers: req.headers,
      },
      (upRes) => {
        res.writeHead(upRes.statusCode || 502, upRes.headers);
        upRes.pipe(res);
      },
    );
    upstream.on('error', () => {
      if (!res.headersSent) res.writeHead(502);
      res.end('Bad Gateway');
    });
    req.pipe(upstream);
    return;
  }

  const safeRel = path.normalize(urlPath).replace(/^(\.\.(\/|\\|$))+/, '');
  const candidate = path.join(webDistDir, safeRel);
  if (candidate.startsWith(webDistDir) && existsSync(candidate) && statSync(candidate).isFile()) {
    const ext = path.extname(candidate).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
    res.end(readFileSync(candidate));
    return;
  }

  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(readFileSync(path.join(webDistDir, 'index.html')));
});

await new Promise((resolve) => gateway.listen(GATEWAY_PORT, '::', resolve));

try {
  let ready = false;
  for (let i = 0; i < 40; i++) {
    try {
      const check = await fetch(`${WEB_ORIGIN}/api/v1/health/ready`);
      if (check.ok) {
        ready = true;
        break;
      }
    } catch {}
    await sleep(500);
  }
  assert.equal(ready, true, 'Gateway + NestJS API did not become ready within 20s');

  // Self-register peerActor in PostgreSQL `users` table via OIDC PKCE + GET /api/v1/me
  const peerAccessToken = await exchangePkceAccessToken(peerActor);
  const meRes = await fetch(`${WEB_ORIGIN}/api/v1/me`, {
    headers: { Authorization: `Bearer ${peerAccessToken}` },
  });
  assert.equal(meRes.status, 200, `Failed registering peer actor via /api/v1/me: HTTP ${meRes.status}`);

  console.log(`[4/4] Running complete Playwright E2E suite (Desktop Chromium + Mobile Pixel 7)...`);
  await new Promise((resolve, reject) => {
    const pw = spawn(process.execPath, [playwrightCli, 'test'], {
      cwd: webDir,
      env: {
        ...process.env,
        E2E_BASE_URL: WEB_ORIGIN,
        E2E_SEED_OWNER_EMAIL: 'owner.demo@atlas.local',
        E2E_SEED_ADMIN_EMAIL: 'admin.demo@atlas.local',
        E2E_SEED_DEMO_PASSWORD: seedDemoPassword,
        E2E_OIDC_EMAIL_CHROMIUM: chromiumActor.email,
        E2E_OIDC_PASSWORD_CHROMIUM: chromiumActor.password,
        E2E_OIDC_EMAIL_MOBILE: mobileActor.email,
        E2E_OIDC_PASSWORD_MOBILE: mobileActor.password,
        E2E_PEER_EMAIL: peerActor.email,
      },
      stdio: 'inherit',
    });
    pw.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`Playwright exited with code ${code}`))));
  });
} finally {
  gateway.close();
  for (const child of children) {
    try {
      child.kill('SIGTERM');
    } catch {}
  }
  rmSync(path.join(webDir, 'test-results'), { recursive: true, force: true });
  rmSync(path.join(webDir, 'playwright-report'), { recursive: true, force: true });
}
