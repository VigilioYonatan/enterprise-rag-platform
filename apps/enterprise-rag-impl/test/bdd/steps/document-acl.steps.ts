import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { After, Before, Given, setDefaultTimeout, Then, When, World } from '@cucumber/cucumber';
import { Client } from 'pg';

/**
 * Each scenario creates its own fixtures in a rollback-only transaction.
 * Run ONLY against an ephemeral DB with all migrations already applied.
 * The checks switch to the restricted rag_app role: a privileged query alone
 * could never establish RLS isolation.
 */
interface Fixture {
  tenant: string;
  kb: string;
  doc: string;
  chunk: string;
  owner: string;
  peer: string;
  outsider: string;
}
class RlsWorld extends World {
  db?: Client;
  data?: Fixture;
  visible = -1;
  groupId?: string;
}
setDefaultTimeout(30_000);
Before(async function (this: RlsWorld) {
  const target = process.env.BDD_MIGRATION_DATABASE_URL;
  if (!target || process.env.BDD_EPHEMERAL_DATABASE !== 'true') {
    throw new Error(
      'BDD requires BDD_MIGRATION_DATABASE_URL and BDD_EPHEMERAL_DATABASE=true (NEVER production)',
    );
  }
  this.db = new Client({ connectionString: target, statement_timeout: 20_000 });
  await this.db.connect();
  await this.db.query('BEGIN');
});
After(async function (this: RlsWorld) {
  if (!this.db) return;
  try {
    await this.db.query('RESET ROLE').catch(() => {});
    await this.db.query('ROLLBACK');
  } finally {
    await this.db.end();
  }
});
Given('an isolated tenant with an owner, a peer and a private document', async function (this: RlsWorld) {
  assert.ok(this.db);
  const tenant = randomUUID(),
    kb = randomUUID(),
    doc = randomUUID(),
    chunk = randomUUID();
  const owner = `bdd-owner-${randomUUID()}`,
    peer = `bdd-peer-${randomUUID()}`,
    outsider = `bdd-outside-${randomUUID()}`;
  this.data = { tenant, kb, doc, chunk, owner, peer, outsider };
  await this.db.query(`INSERT INTO users(sub,email) VALUES ($1,$2),($3,$4),($5,$6)`, [
    owner,
    `${owner}@example.invalid`,
    peer,
    `${peer}@example.invalid`,
    outsider,
    `${outsider}@example.invalid`,
  ]);
  await this.db.query(`INSERT INTO tenants(id,name,created_by_sub) VALUES($1,'BDD isolated tenant',$2)`, [
    tenant,
    owner,
  ]);
  await this.db.query(
    `INSERT INTO memberships(tenant_id,user_sub,role) VALUES($1,$2,'owner'),($1,$3,'viewer')`,
    [tenant, owner, peer],
  );
  await this.db.query(
    `INSERT INTO knowledge_bases(id,tenant_id,name,created_by_sub) VALUES($1,$2,'BDD KB',$3)`,
    [kb, tenant, owner],
  );
  await this.db.query(
    `INSERT INTO documents(id,tenant_id,knowledge_base_id,owner_sub,title,body,visibility,status)
    VALUES($1,$2,$3,$4,'BDD secret','BDD unique test','private','ready')`,
    [doc, tenant, kb, owner],
  );
  await this.db.query(
    `INSERT INTO document_chunks(id,tenant_id,document_id,ordinal,content) VALUES($1,$2,$3,0,'BDD_PRIVATE_SOURCE')`,
    [chunk, tenant, doc],
  );
});
Given('the owner grants the peer permission on the document', async function (this: RlsWorld) {
  assert.ok(this.db && this.data);
  const { doc, tenant, peer, owner } = this.data;
  await this.db.query(
    `INSERT INTO document_grants(document_id,tenant_id,user_sub,created_by_sub)
    VALUES($1,$2,$3,$4)`,
    [doc, tenant, peer, owner],
  );
});
Given('the owner revokes the peer permission on the document', async function (this: RlsWorld) {
  assert.ok(this.db && this.data);
  await this.db.query('DELETE FROM document_grants WHERE document_id=$1 AND user_sub=$2', [
    this.data.doc,
    this.data.peer,
  ]);
});
async function readAs(world: RlsWorld, sub: string) {
  assert.ok(world.db && world.data);
  await world.db.query('SET ROLE rag_app');
  try {
    await world.db.query(`SELECT set_config('app.actor_sub',$1,true)`, [sub]);
    const result = await world.db.query(`SELECT id FROM document_chunks WHERE document_id=$1`, [
      world.data.doc,
    ]);
    world.visible = result.rowCount ?? 0;
  } finally {
    await world.db.query('RESET ROLE');
  }
}
When(
  'the peer queries the private document as the restricted database role',
  async function (this: RlsWorld) {
    assert.ok(this.data);
    await readAs(this, this.data.peer);
  },
);
When(
  'an outsider queries the private document as the restricted database role',
  async function (this: RlsWorld) {
    assert.ok(this.data);
    await readAs(this, this.data.outsider);
  },
);
Then('no private chunks are returned', function (this: RlsWorld) {
  assert.equal(this.visible, 0);
});
Then('exactly one private chunk is returned', function (this: RlsWorld) {
  assert.equal(this.visible, 1);
});

Given(
  'the owner grants the private document to a group containing the peer',
  async function (this: RlsWorld) {
    assert.ok(this.db && this.data);
    const groupId = randomUUID();
    this.groupId = groupId;
    await this.db.query(`INSERT INTO access_groups(id,tenant_id,name) VALUES($1,$2,$3)`, [
      groupId,
      this.data.tenant,
      `bdd-group-${groupId.slice(0, 8)}`,
    ]);
    await this.db.query(
      `INSERT INTO access_group_memberships(group_id,tenant_id,user_sub) VALUES($1,$2,$3)`,
      [groupId, this.data.tenant, this.data.peer],
    );
    await this.db.query(
      `INSERT INTO document_group_grants(document_id,group_id,tenant_id,created_by_sub) VALUES($1,$2,$3,$4)`,
      [this.data.doc, groupId, this.data.tenant, this.data.owner],
    );
  },
);
Given('the peer is removed from the granted group', async function (this: RlsWorld) {
  assert.ok(this.db && this.data && this.groupId);
  await this.db.query('DELETE FROM access_group_memberships WHERE group_id=$1 AND user_sub=$2', [
    this.groupId,
    this.data.peer,
  ]);
});
