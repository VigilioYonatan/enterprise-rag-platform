#!/usr/bin/env node
/**
 * Live API acceptance test: private document never crosses same-tenant ACLs.
 * Requires TWO real, different OIDC access tokens and an EPHEMERAL test stack.
 * Unlike unit mocks, this exercises JWT, routes, PostgreSQL RLS, worker, FTS,
 * and access revocation through the deployed HTTP API. Never run on production.
 */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import process from 'node:process';

if (process.env.E2E_EPHEMERAL_ENV !== 'true') {
  throw new Error('Refusing to mutate a non-ephemeral environment');
}
const base = `${(process.env.E2E_BASE_URL || 'http://127.0.0.1:8080').replace(/\/$/, '')}/api/v1`;
const owner = process.env.E2E_OWNER_ACCESS_TOKEN;
const peer = process.env.E2E_PEER_ACCESS_TOKEN;
const peerEmail = process.env.E2E_PEER_EMAIL;
if (!owner || !peer || owner === peer || !peerEmail) {
  throw new Error('Two distinct OIDC tokens and peer email required');
}

async function request(token, path, { method = 'GET', body } = {}) {
  const response = await fetch(base + path, {
    method,
    signal: AbortSignal.timeout(12000),
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const raw = await response.text();
  let result;
  try {
    result = raw ? JSON.parse(raw) : null;
  } catch {
    throw new Error(`Non-JSON response at ${path}: HTTP ${response.status}`);
  }
  return { status: response.status, body: result };
}

function expectStatus(response, status, context) {
  assert.equal(response.status, status, `${context}: expected ${status}, received ${response.status}`);
  return response.body;
}

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const marker = `ragacl${randomUUID().replaceAll('-', '')}`;
const report = { suite: 'authorized retrieval E2E', marker, checks: [], environment: 'ephemeral' };

function pass(label) {
  report.checks.push(label);
  console.log(`PASS: ${label}`);
}

try {
  const ownerMe = expectStatus(await request(owner, '/me'), 200, 'owner /me');
  const peerMe = expectStatus(await request(peer, '/me'), 200, 'peer /me');
  assert.notEqual(ownerMe.sub, peerMe.sub, 'Actors must be different');
  assert.equal(peerMe.email?.toLowerCase(), peerEmail.toLowerCase(), 'peer email does not match token identity');
  pass('OIDC two identities');

  const tenant = expectStatus(
    await request(owner, '/tenants', { method: 'POST', body: { name: `RAG E2E ${marker}` } }),
    201,
    'create tenant',
  );
  const kb = expectStatus(
    await request(owner, '/knowledge-bases', {
      method: 'POST',
      body: { tenant_id: tenant.id, name: `ACL test ${marker}` },
    }),
    201,
    'create KB',
  );
  pass('tenant/KB provisioning');

  const outsider = await request(peer, '/retrieval/search', {
    method: 'POST',
    body: { knowledge_base_id: kb.id, query: marker },
  });
  assert.ok([403, 404].includes(outsider.status), 'Outsider must not query tenant KB');
  pass('outsider cannot query tenant KB');

  expectStatus(
    await request(owner, `/tenants/${tenant.id}/members`, {
      method: 'POST',
      body: { email: peerEmail, role: 'viewer' },
    }),
    201,
    'member grant',
  );
  const doc = expectStatus(
    await request(owner, `/knowledge-bases/${kb.id}/documents`, {
      method: 'POST',
      body: {
        title: 'Private acceptance fixture',
        text: `The uniquely authorized fact is ${marker}.`,
        visibility: 'private',
      },
    }),
    201,
    'private doc',
  );

  let ready = false;
  for (let i = 0; i < 45; i++) {
    const res = expectStatus(await request(owner, `/knowledge-bases/${kb.id}/documents`), 200, 'documents list');
    const rows = Array.isArray(res) ? res : (res?.results ?? []);
    const d = rows.find((x) => x.id === doc.id);
    if (d?.status === 'failed') throw new Error('Worker failed to index fixture');
    if (d?.status === 'ready') {
      ready = true;
      break;
    }
    await delay(2000);
  }
  assert.ok(ready, 'Timed out waiting for real worker indexing');
  pass('document ingested by running worker');

  const search = (token) =>
    request(token, '/retrieval/search', {
      method: 'POST',
      body: { knowledge_base_id: kb.id, query: marker },
    });
  const ownerResults = expectStatus(await search(owner), 200, 'owner retrieval');
  assert.ok(ownerResults.some((h) => h.document_id === doc.id), 'Owner must retrieve own document');

  const peerBefore = expectStatus(await search(peer), 200, 'peer retrieval before ACL');
  assert.ok(peerBefore.every((h) => h.document_id !== doc.id), 'Unauthorized peer retrieved private content');
  pass('same-tenant peer cannot retrieve private chunks');

  expectStatus(
    await request(owner, `/documents/${doc.id}/access`, {
      method: 'PUT',
      body: { user_subs: [peerMe.sub] },
    }),
    200,
    'grant ACL',
  );
  const peerDuring = expectStatus(await search(peer), 200, 'peer retrieval with ACL');
  assert.ok(peerDuring.some((h) => h.document_id === doc.id), 'Explicit grant did not expose document');
  pass('explicit document grant works');

  expectStatus(
    await request(owner, `/documents/${doc.id}/access`, {
      method: 'PUT',
      body: { user_subs: [] },
    }),
    200,
    'revoke ACL',
  );
  const peerAfter = expectStatus(await search(peer), 200, 'peer retrieval after revocation');
  assert.ok(peerAfter.every((h) => h.document_id !== doc.id), 'Revoked document still visible to peer');
  pass('ACL revocation removes retrieval immediately');

  console.log(JSON.stringify({ ...report, status: 'PASS' }, null, 2));
} catch (error) {
  console.error(
    JSON.stringify(
      { ...report, status: 'FAIL', error: error instanceof Error ? error.message : 'Unknown error' },
      null,
      2,
    ),
  );
  process.exitCode = 1;
}
