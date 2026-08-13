import { Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';
import pino from 'pino';
import { env } from '../config/env';

export const pinoLogger = pino({
  level: env.LOG_LEVEL,
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'headers.authorization',
      'password',
      'secret',
      'access_token',
      'refresh_token',
    ],
    censor: '[REDACTED]',
  },
});

@Module({
  imports: [
    LoggerModule.forRoot({
      pinoHttp: {
        level: env.LOG_LEVEL,
        autoLogging: {
          ignore: (req) => req.url === '/api/v1/health/live' || req.url === '/metrics',
        },
        genReqId: (req, res) => {
          const existing = res.getHeader('X-Request-Id');
          if (typeof existing === 'string' && existing.length > 0) {
            return existing;
          }
          const incoming = req.headers['x-request-id'];
          return typeof incoming === 'string' && /^[A-Za-z0-9_-]{8,64}$/.test(incoming)
            ? incoming
            : 'internal-request';
        },
        redact: {
          paths: ['req.headers.authorization', 'req.headers.cookie', 'res.headers["set-cookie"]'],
          censor: '[REDACTED]',
        },
        serializers: {
          req: (req: { id?: unknown; method?: string; url?: string }) => ({
            id: req.id,
            method: req.method,
            path: typeof req.url === 'string' ? req.url.split('?')[0] : undefined,
          }),
          res: (res: { statusCode?: number }) => ({
            statusCode: res.statusCode,
          }),
        },
      },
    }),
  ],
  exports: [LoggerModule],
})
export class StructuredLoggerModule {}
