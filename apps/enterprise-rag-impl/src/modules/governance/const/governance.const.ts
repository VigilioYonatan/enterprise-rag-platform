export const TENANT_ROLES = ['owner', 'admin', 'viewer'] as const;
export const INVITABLE_ROLES = ['admin', 'viewer'] as const;
export const DLQ_SOURCES = ['ingestion_job', 'outbox_event'] as const;
export const MAX_DOCUMENT_USER_GRANTS = 100;
export const MAX_DOCUMENT_GROUP_GRANTS = 50;
export const MIN_DAILY_ANSWER_LIMIT = 1;
export const MAX_DAILY_ANSWER_LIMIT = 10_000;
export const MAX_DAILY_COST_LIMIT_USD = 1_000_000;
