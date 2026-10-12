export const AUDIT_PAGE_SIZE = 20;
export const MIN_DAILY_ANSWER_LIMIT = 1;
export const MAX_DAILY_ANSWER_LIMIT = 10000;
export const MIN_DAILY_COST_USD = 0.01;
export const MAX_DAILY_COST_USD = 1000000;

export const DLQ_SOURCES = ['ingestion_job', 'outbox_event'] as const;
