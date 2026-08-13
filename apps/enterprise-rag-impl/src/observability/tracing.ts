/** Preloaded before Nest, HTTP, pg, or SDK imports; tracing is opt-in and fail-closed for privacy. */
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { NodeSDK } from '@opentelemetry/sdk-node';

if (process.env.OTEL_TRACING_ENABLED === 'true' || process.env.OTEL_TRACING_ENABLED === '1') {
  const endpoint = process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT;
  if (!endpoint) {
    throw new Error('Tracing enabled without an OTLP endpoint');
  }
  const sdk = new NodeSDK({
    resource: resourceFromAttributes({
      'service.name': process.env.OTEL_SERVICE_NAME || 'rag-api',
      'deployment.environment.name': process.env.DEPLOYMENT_ENV || 'local',
    }),
    traceExporter: new OTLPTraceExporter({ url: endpoint }),
    // FS, Redis, PostgreSQL and body-capturing instrumentation are deliberately
    // disabled to avoid leaking source queries, document contents or credentials.
    instrumentations: [
      getNodeAutoInstrumentations({
        '@opentelemetry/instrumentation-fs': { enabled: false },
        '@opentelemetry/instrumentation-pg': { enabled: false },
        '@opentelemetry/instrumentation-redis': { enabled: false },
        '@opentelemetry/instrumentation-http': {
          enabled: true,
          requestHook: (span, request) => {
            if ('url' in request && typeof request.url === 'string') {
              const sanitizedPath = request.url.split('?')[0] || '/';
              span.setAttribute('url.path', sanitizedPath);
            }
          },
        },
      }),
    ],
  });
  sdk.start();
  const shutdownSdk = () => {
    void sdk.shutdown().catch(() => {});
  };
  process.once('SIGTERM', shutdownSdk);
  process.once('SIGINT', shutdownSdk);
}
