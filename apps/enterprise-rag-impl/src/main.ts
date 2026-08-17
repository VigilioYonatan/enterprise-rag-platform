import './observability/tracing';
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { apiReference } from '@scalar/nestjs-api-reference';
import express from 'express';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { env } from './config/env';
import { pinoLogger } from './observability/logger.module';
import { requestIdMiddleware } from './observability/request-id.middleware';
import { createEndpointRateLimiter } from './security/rate-limiter';

async function main(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    bodyParser: false,
    bufferLogs: true,
  });
  app.useLogger(app.get(Logger));

  // API has no host-published port: Caddy is the single trusted forwarding hop.
  app.getHttpAdapter().getInstance().set('trust proxy', 1);
  app.use(requestIdMiddleware);
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(express.json({ limit: '160kb' }));

  app.use('/api/v1/answers', createEndpointRateLimiter({ windowMs: 60_000, limit: 20 }));
  app.use('/api/v1/conversations', createEndpointRateLimiter({ windowMs: 60_000, limit: 30 }));
  app.use('/api/v1/retrieval/search', createEndpointRateLimiter({ windowMs: 60_000, limit: 60 }));
  app.use('/api/v1/evaluation/runs', createEndpointRateLimiter({ windowMs: 60_000, limit: 5 }));
  app.use('/api/v1/knowledge-bases', createEndpointRateLimiter({ windowMs: 60_000, limit: 60 }));
  app.use('/api/v1/documents', createEndpointRateLimiter({ windowMs: 60_000, limit: 60 }));

  app.enableCors({
    origin: env.WEB_ORIGIN,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Authorization', 'Content-Type', 'X-Request-Id'],
    exposedHeaders: ['X-Request-Id'],
    maxAge: 600,
  });

  if (env.NODE_ENV !== 'production' || env.ENABLE_SWAGGER_UI) {
    const doc = new DocumentBuilder()
      .setTitle('Enterprise RAG Platform API')
      .setDescription('Zero-trust ACL-aware Enterprise RAG HTTP Contract (Vigilio 2026)')
      .setVersion('0.1.0-beta')
      .addBearerAuth()
      .build();
    const spec = SwaggerModule.createDocument(app, doc);
    app
      .getHttpAdapter()
      .get('/api/openapi.json', (_req: unknown, res: { json: (payload: unknown) => void }) => {
        res.json(spec);
      });
    app.use('/api/docs', apiReference({ content: spec }));
  }

  app.enableShutdownHooks();
  await app.listen(env.PORT, '0.0.0.0');
}

if (require.main === module) {
  main().catch((error) => {
    pinoLogger.error(
      { errName: error instanceof Error ? error.name : 'UnknownError' },
      'API bootstrap failed',
    );
    process.exitCode = 1;
  });
}
