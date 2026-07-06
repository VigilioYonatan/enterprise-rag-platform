/**
 * Drizzle ORM schema catalog synchronized with SQL migrations 001..012.
 * PostgreSQL migrations remain authoritative for RLS, SECURITY DEFINER functions and pgvector HNSW indices.
 * Column names are derived directly from snake_case property keys adhering to Drizzle conventions.
 */
import {
  bigint,
  boolean,
  integer,
  jsonb,
  numeric,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import type { MessageRoleSchema } from '../modules/conversations/domain/schemas/conversation-message.schema';
import type { IngestionJobStatus } from '../modules/governance/domain/schemas/ingestion-job.schema';
import type { TenantRoleSchema } from '../modules/governance/domain/schemas/tenant-member.schema';
import type {
  DocumentStatusEnum,
  DocumentVisibilitySchema,
} from '../modules/knowledge/domain/schemas/document.schema';

export const users = pgTable('users', {
  sub: text().primaryKey(),
  email: text(),
  created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

export const tenants = pgTable('tenants', {
  id: uuid().primaryKey().defaultRandom(),
  name: text().notNull(),
  created_by_sub: text().notNull(),
  created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

export const memberships = pgTable(
  'memberships',
  {
    tenant_id: uuid().notNull(),
    user_sub: text().notNull(),
    role: text().$type<TenantRoleSchema>().notNull(),
  },
  (table) => [primaryKey({ columns: [table.tenant_id, table.user_sub] })],
);

export const knowledge_bases = pgTable('knowledge_bases', {
  id: uuid().primaryKey().defaultRandom(),
  tenant_id: uuid().notNull(),
  name: text().notNull(),
  created_by_sub: text().notNull(),
});

export const documents = pgTable('documents', {
  id: uuid().primaryKey().defaultRandom(),
  tenant_id: uuid().notNull(),
  knowledge_base_id: uuid().notNull(),
  owner_sub: text().notNull(),
  title: text().notNull(),
  body: text().notNull(),
  visibility: text().$type<DocumentVisibilitySchema>().notNull(),
  status: text().$type<DocumentStatusEnum>().notNull().default('queued'),
  version: integer().notNull().default(1),
  original_filename: text(),
  media_type: text(),
  file_path: text(),
  file_sha256: text(),
  byte_size: integer(),
  created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
  deleted_at: timestamp({ withTimezone: true }),
});

export const document_versions = pgTable('document_versions', {
  id: uuid().primaryKey().defaultRandom(),
  document_id: uuid().notNull(),
  tenant_id: uuid().notNull(),
  version: integer().notNull(),
  sha256: text(),
  media_type: text(),
  original_filename: text(),
  created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

export const document_chunks = pgTable('document_chunks', {
  id: uuid().primaryKey().defaultRandom(),
  tenant_id: uuid().notNull(),
  document_id: uuid().notNull(),
  ordinal: integer().notNull(),
  content: text().notNull(),
  document_version: integer().notNull().default(1),
  embedding_model: text(),
});

export const document_grants = pgTable(
  'document_grants',
  {
    document_id: uuid().notNull(),
    tenant_id: uuid().notNull(),
    user_sub: text().notNull(),
    permission: text().notNull().default('read'),
    created_by_sub: text().notNull(),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.document_id, table.user_sub] })],
);

export const access_groups = pgTable('access_groups', {
  id: uuid().primaryKey().defaultRandom(),
  tenant_id: uuid().notNull(),
  name: text().notNull(),
});

export const access_group_memberships = pgTable(
  'access_group_memberships',
  {
    group_id: uuid().notNull(),
    tenant_id: uuid().notNull(),
    user_sub: text().notNull(),
  },
  (table) => [primaryKey({ columns: [table.group_id, table.user_sub] })],
);

export const document_group_grants = pgTable(
  'document_group_grants',
  {
    document_id: uuid().notNull(),
    group_id: uuid().notNull(),
    tenant_id: uuid().notNull(),
    created_by_sub: text().notNull(),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.document_id, table.group_id] })],
);

export const ingestion_jobs = pgTable('ingestion_jobs', {
  id: uuid().primaryKey().defaultRandom(),
  document_id: uuid().notNull(),
  status: text().$type<IngestionJobStatus>().notNull(),
  stage: text().notNull().default('queued'),
  attempts: integer().notNull().default(0),
  error_message: text(),
  next_attempt_at: timestamp({ withTimezone: true }),
  completed_at: timestamp({ withTimezone: true }),
  lease_token: uuid(),
  lease_expires_at: timestamp({ withTimezone: true }),
  created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

export const conversations = pgTable('conversations', {
  id: uuid().primaryKey().defaultRandom(),
  knowledge_base_id: uuid().notNull(),
  tenant_id: uuid().notNull(),
  created_by_sub: text().notNull(),
  title: text().notNull(),
  created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
  deleted_at: timestamp({ withTimezone: true }),
});

export const messages = pgTable('messages', {
  id: uuid().primaryKey().defaultRandom(),
  conversation_id: uuid().notNull(),
  role: text().$type<MessageRoleSchema>().notNull(),
  content: text().notNull(),
  abstained: boolean().notNull().default(false),
  created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

export const answer_citations = pgTable('answer_citations', {
  id: uuid().primaryKey().defaultRandom(),
  message_id: uuid().notNull(),
  document_id: uuid().notNull(),
  chunk_id: uuid().notNull(),
  document_version: integer().notNull(),
  reference_index: integer().notNull(),
  created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

export const answer_evidence = pgTable(
  'answer_evidence',
  {
    message_id: uuid().notNull(),
    document_id: uuid().notNull(),
    chunk_id: uuid().notNull(),
    document_version: integer().notNull(),
  },
  (table) => [primaryKey({ columns: [table.message_id, table.chunk_id] })],
);

export const evaluation_datasets = pgTable('evaluation_datasets', {
  id: uuid().primaryKey().defaultRandom(),
  tenant_id: uuid().notNull(),
  knowledge_base_id: uuid().notNull(),
  created_by_sub: text().notNull(),
  name: text().notNull(),
  revision: integer().notNull().default(1),
  created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

export const evaluation_cases = pgTable('evaluation_cases', {
  id: uuid().primaryKey().defaultRandom(),
  dataset_id: uuid().notNull(),
  question: text().notNull(),
  expected_document_ids: uuid().array().notNull(),
  expected_abstention: boolean().notNull().default(false),
  created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

export const evaluation_runs = pgTable('evaluation_runs', {
  id: uuid().primaryKey().defaultRandom(),
  dataset_id: uuid().notNull(),
  created_by_sub: text().notNull(),
  status: text().notNull().default('running'),
  dataset_revision: integer(),
  recall_at_6: numeric({ precision: 7, scale: 5 }),
  mrr_at_6: numeric({ precision: 7, scale: 5 }),
  ndcg_at_6: numeric({ precision: 7, scale: 5 }),
  precision_at_6: numeric({ precision: 7, scale: 5 }),
  abstention_pass_rate: numeric({ precision: 7, scale: 5 }),
  case_count: integer().notNull().default(0),
  started_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
  completed_at: timestamp({ withTimezone: true }),
  error_code: text(),
});

export const evaluation_results = pgTable('evaluation_results', {
  id: uuid().primaryKey().defaultRandom(),
  run_id: uuid().notNull(),
  case_id: uuid().notNull(),
  rank_of_first_match: integer(),
  recall_at_6: numeric({ precision: 7, scale: 5 }).notNull(),
  retrieved_document_ids: uuid().array().notNull(),
  ndcg_at_6: numeric({ precision: 7, scale: 5 }).notNull().default('0'),
  precision_at_6: numeric({ precision: 7, scale: 5 }).notNull().default('0'),
  abstention_pass: boolean(),
  created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

export const usage_events = pgTable('usage_events', {
  id: uuid().primaryKey().defaultRandom(),
  tenant_id: uuid().notNull(),
  actor_sub: text().notNull(),
  category: text().notNull(),
  model_name: text(),
  input_tokens: integer().notNull().default(0),
  output_tokens: integer().notNull().default(0),
  latency_ms: bigint({ mode: 'number' }).notNull().default(0),
  cost_usd: numeric({ precision: 18, scale: 8 }).notNull().default('0'),
  reserved_cost_usd: numeric({ precision: 18, scale: 8 }).notNull().default('0'),
  created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

export const tenant_budgets = pgTable('tenant_budgets', {
  tenant_id: uuid().primaryKey(),
  daily_answer_limit: integer().notNull().default(100),
  daily_cost_limit_usd: numeric({ precision: 12, scale: 2 }).notNull().default('1000'),
  updated_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

export const audit_events = pgTable('audit_events', {
  id: uuid().primaryKey().defaultRandom(),
  tenant_id: uuid().notNull(),
  actor_sub: text().notNull(),
  action: text().notNull(),
  target_type: text().notNull(),
  target_id: text().notNull(),
  created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

export const storage_deletions = pgTable('storage_deletions', {
  id: uuid().primaryKey().defaultRandom(),
  document_id: uuid(),
  object_key: text().notNull(),
  status: text().notNull().default('pending'),
  attempts: integer().notNull().default(0),
  next_attempt_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
  lease_expires_at: timestamp({ withTimezone: true }),
  updated_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

export const outbox_events = pgTable('outbox_events', {
  id: uuid().primaryKey().defaultRandom(),
  tenant_id: uuid().notNull(),
  topic: text().notNull(),
  aggregate_id: uuid().notNull(),
  payload: jsonb().notNull(),
  status: text().notNull().default('pending'),
  attempts: integer().notNull().default(0),
  next_attempt_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
  lease_expires_at: timestamp({ withTimezone: true }),
  last_error: text(),
  created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
  dispatched_at: timestamp({ withTimezone: true }),
});

export const processed_events = pgTable('processed_events', {
  event_key: text().primaryKey(),
  topic: text().notNull(),
  processed_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
});
