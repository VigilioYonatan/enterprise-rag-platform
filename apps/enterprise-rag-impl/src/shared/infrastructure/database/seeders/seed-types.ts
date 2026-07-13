import { createHash } from 'node:crypto';
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { PoolClient } from 'pg';
import * as schema from '../../../../database/schema';

export type SeedDrizzleDb = NodePgDatabase<typeof schema>;

export interface SeedActorIdentity {
  sub: string;
  email: string;
}

export interface SeedActors {
  owner: SeedActorIdentity;
  admin: SeedActorIdentity;
  viewer: SeedActorIdentity;
}

export interface SeedIds {
  tenantId: string;
  tenant_id?: string;
  securityKbId: string;
  security_kb_id?: string;
  finopsKbId: string;
  finops_kb_id?: string;
  zeroTrustDocId: string;
  zero_trust_doc_id?: string;
  incidentRunbookDocId: string;
  incident_runbook_doc_id?: string;
  finopsManualDocId: string;
  finops_manual_doc_id?: string;
  zeroTrustVersionId: string;
  zero_trust_version_id?: string;
  incidentRunbookVersionId: string;
  incident_runbook_version_id?: string;
  finopsManualVersionId: string;
  finops_manual_version_id?: string;
  zeroTrustChunk1Id: string;
  zeroTrustChunk2Id: string;
  incidentChunk1Id: string;
  incidentChunk2Id: string;
  finopsChunk1Id: string;
  finopsChunk2Id: string;
  zeroTrustJobId: string;
  zero_trust_job_id?: string;
  incidentJobId: string;
  incident_job_id?: string;
  finopsJobId: string;
  finops_job_id?: string;
  zeroTrustOutboxId: string;
  zero_trust_outbox_id?: string;
  incidentOutboxId: string;
  incident_outbox_id?: string;
  finopsOutboxId: string;
  finops_outbox_id?: string;
  csirtGroupId: string;
  csirt_group_id?: string;
  auditGroupId: string;
  audit_group_id?: string;
  usageRetrievalId: string;
  usageAnswerId: string;
  usageEvalId: string;
  auditSeededId: string;
  auditDocIngestedId: string;
  auditGroupCreatedId: string;
  auditBudgetUpdatedId: string;
  conversationId: string;
  conversation_id?: string;
  userMessageId: string;
  assistantMessageId: string;
  citation1Id: string;
  citation2Id: string;
  datasetId: string;
  dataset_id?: string;
  caseRlsId: string;
  caseClamavId: string;
  caseAbstentionId: string;
  evalRunId: string;
  eval_run_id?: string;
}

export interface SeedExecutionContext {
  readonly actors: SeedActors;
  readonly ids: SeedIds;
  readonly embedBatch: (texts: string[]) => Promise<Array<number[] | null>>;
  readonly embeddingModelName: string;
  readonly withActorDb: <T>(
    actorSub: string,
    fn: (db: SeedDrizzleDb, client: PoolClient) => Promise<T>,
  ) => Promise<T>;
  readonly withWorkerDb: <T>(fn: (db: SeedDrizzleDb, client: PoolClient) => Promise<T>) => Promise<T>;
}

export const DEFAULT_SEED_ACTORS: SeedActors = {
  owner: {
    sub: '00000000-0000-4000-8000-000000000101',
    email: 'owner.demo@atlas.local',
  },
  admin: {
    sub: '00000000-0000-4000-8000-000000000102',
    email: 'admin.demo@atlas.local',
  },
  viewer: {
    sub: '00000000-0000-4000-8000-000000000103',
    email: 'viewer.demo@atlas.local',
  },
};

/**
 * Generates a deterministic RFC-4122 v4-shaped UUID scoped to the owner identity
 * so repeated runs are 100% idempotent and never collide across different OIDC realms.
 */
export function deterministicSeedUuid(namespace: string, key: string): string {
  const bytes = Buffer.from(createHash('sha256').update(`${namespace}:${key}`).digest().subarray(0, 16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

export function buildSeedIds(ownerSub: string): SeedIds {
  const ns = `atlas-enterprise-seed-v6:${ownerSub}`;
  const tenant_id = deterministicSeedUuid(ns, 'tenant:atlas-demo');
  const security_kb_id = deterministicSeedUuid(ns, 'kb:security-zero-trust');
  const finops_kb_id = deterministicSeedUuid(ns, 'kb:finops-governance');
  const zero_trust_doc_id = deterministicSeedUuid(ns, 'doc:zero-trust-policy');
  const incident_runbook_doc_id = deterministicSeedUuid(ns, 'doc:incident-clamav-runbook');
  const finops_manual_doc_id = deterministicSeedUuid(ns, 'doc:finops-budget-manual');
  const zero_trust_version_id = deterministicSeedUuid(ns, 'doc-version:zero-trust:v1');
  const incident_runbook_version_id = deterministicSeedUuid(ns, 'doc-version:incident:v1');
  const finops_manual_version_id = deterministicSeedUuid(ns, 'doc-version:finops:v1');
  const zero_trust_job_id = deterministicSeedUuid(ns, 'job:zero-trust');
  const incident_job_id = deterministicSeedUuid(ns, 'job:incident');
  const finops_job_id = deterministicSeedUuid(ns, 'job:finops');
  const zero_trust_outbox_id = deterministicSeedUuid(ns, 'outbox:zero-trust');
  const incident_outbox_id = deterministicSeedUuid(ns, 'outbox:incident');
  const finops_outbox_id = deterministicSeedUuid(ns, 'outbox:finops');
  const csirt_group_id = deterministicSeedUuid(ns, 'group:csirt');
  const audit_group_id = deterministicSeedUuid(ns, 'group:internal-audit');
  const conversation_id = deterministicSeedUuid(ns, 'conversation:rls-audit');
  const dataset_id = deterministicSeedUuid(ns, 'eval-dataset:q4-security');
  const eval_run_id = deterministicSeedUuid(ns, 'eval-run:baseline-1');

  return {
    tenantId: tenant_id,
    tenant_id,
    securityKbId: security_kb_id,
    security_kb_id,
    finopsKbId: finops_kb_id,
    finops_kb_id,
    zeroTrustDocId: zero_trust_doc_id,
    zero_trust_doc_id,
    incidentRunbookDocId: incident_runbook_doc_id,
    incident_runbook_doc_id,
    finopsManualDocId: finops_manual_doc_id,
    finops_manual_doc_id,
    zeroTrustVersionId: zero_trust_version_id,
    zero_trust_version_id,
    incidentRunbookVersionId: incident_runbook_version_id,
    incident_runbook_version_id,
    finopsManualVersionId: finops_manual_version_id,
    finops_manual_version_id,
    zeroTrustChunk1Id: deterministicSeedUuid(ns, 'chunk:zero-trust:0'),
    zeroTrustChunk2Id: deterministicSeedUuid(ns, 'chunk:zero-trust:1'),
    incidentChunk1Id: deterministicSeedUuid(ns, 'chunk:incident:0'),
    incidentChunk2Id: deterministicSeedUuid(ns, 'chunk:incident:1'),
    finopsChunk1Id: deterministicSeedUuid(ns, 'chunk:finops:0'),
    finopsChunk2Id: deterministicSeedUuid(ns, 'chunk:finops:1'),
    zeroTrustJobId: zero_trust_job_id,
    zero_trust_job_id,
    incidentJobId: incident_job_id,
    incident_job_id,
    finopsJobId: finops_job_id,
    finops_job_id,
    zeroTrustOutboxId: zero_trust_outbox_id,
    zero_trust_outbox_id,
    incidentOutboxId: incident_outbox_id,
    incident_outbox_id,
    finopsOutboxId: finops_outbox_id,
    finops_outbox_id,
    csirtGroupId: csirt_group_id,
    csirt_group_id,
    auditGroupId: audit_group_id,
    audit_group_id,
    usageRetrievalId: deterministicSeedUuid(ns, 'usage:retrieval-1'),
    usageAnswerId: deterministicSeedUuid(ns, 'usage:answer-1'),
    usageEvalId: deterministicSeedUuid(ns, 'usage:evaluation-1'),
    auditSeededId: deterministicSeedUuid(ns, 'audit:tenant-seeded'),
    auditDocIngestedId: deterministicSeedUuid(ns, 'audit:doc-ingested'),
    auditGroupCreatedId: deterministicSeedUuid(ns, 'audit:group-created'),
    auditBudgetUpdatedId: deterministicSeedUuid(ns, 'audit:budget-updated'),
    conversationId: conversation_id,
    conversation_id,
    userMessageId: deterministicSeedUuid(ns, 'message:user-1'),
    assistantMessageId: deterministicSeedUuid(ns, 'message:assistant-1'),
    citation1Id: deterministicSeedUuid(ns, 'citation:1'),
    citation2Id: deterministicSeedUuid(ns, 'citation:2'),
    datasetId: dataset_id,
    dataset_id,
    caseRlsId: deterministicSeedUuid(ns, 'eval-case:rls'),
    caseClamavId: deterministicSeedUuid(ns, 'eval-case:clamav'),
    caseAbstentionId: deterministicSeedUuid(ns, 'eval-case:abstention'),
    evalRunId: eval_run_id,
    eval_run_id,
  };
}

export function createSeedDrizzle(client: PoolClient): SeedDrizzleDb {
  return drizzle(client, { schema });
}
