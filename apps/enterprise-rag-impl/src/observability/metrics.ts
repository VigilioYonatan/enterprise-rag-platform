import { Counter, collectDefaultMetrics, Histogram, register } from 'prom-client';

collectDefaultMetrics({ register, prefix: 'rag_' });

export const httpRequests = new Counter({
  name: 'rag_http_requests_total',
  help: 'HTTP requests by route handler and outcome',
  labelNames: ['method', 'handler', 'outcome'],
});

export const httpDuration = new Histogram({
  name: 'rag_http_duration_seconds',
  help: 'HTTP request duration by handler',
  labelNames: ['method', 'handler'],
  buckets: [0.025, 0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10, 30],
});

export const workerJobsProcessed = new Counter({
  name: 'rag_worker_jobs_total',
  help: 'Background ingestion jobs processed by outcome',
  labelNames: ['outcome'],
});

export const workerMalwareBlocked = new Counter({
  name: 'rag_worker_malware_blocked_total',
  help: 'Uploaded files blocked permanently by ClamAV',
});

export const outboxEventsDispatched = new Counter({
  name: 'rag_outbox_events_total',
  help: 'Transactional outbox events relayed by outcome',
  labelNames: ['event_type', 'outcome'],
});

export { register };
