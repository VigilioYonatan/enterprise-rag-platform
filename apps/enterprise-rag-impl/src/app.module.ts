import { Controller, Get, Module, OnApplicationShutdown, ServiceUnavailableException } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { ApiOperation, ApiServiceUnavailableResponse, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { ConversationsModule } from '@/conversations/conversations.module';
import { EvaluationsModule } from '@/evaluations/evaluations.module';
import { GovernanceModule } from '@/governance/governance.module';
import { KnowledgeModule } from '@/knowledge/knowledge.module';
import { UploadsModule } from '@/uploads/uploads.module';
import { AppConfigModule } from '~/config/app-config.module';
import { closePool, pool } from '~/database/pool';
import { StructuredLoggerModule } from '~/observability/logger.module';
import { MetricsController } from '~/observability/metrics.controller';
import { MetricsInterceptor } from '~/observability/metrics.interceptor';
import { ApiZodOk } from '~/openapi/zod-decorators';
import { DatabaseExceptionFilter } from '~/shared/database-exception.filter';

const healthStatusResponseDto = z.object({
  status: z.enum(['alive', 'ready']),
});

@ApiTags('Health')
@Controller('api/v1/health')
export class HealthController {
  @Get('live')
  @ApiOperation({
    operationId: 'healthLive',
    summary: 'Process liveness probe',
    description: `📦 Proceso: Monitorización y salud de infraestructura
🔧 Funcionalidad: Confirma que el proceso Node.js/NestJS responde a sondeos HTTP de orquestación (Docker/K8s).`,
  })
  @ApiZodOk(healthStatusResponseDto)
  live() {
    return { status: 'alive' as const };
  }

  @Get('ready')
  @ApiOperation({
    operationId: 'healthReady',
    summary: 'Database connectivity and schema readiness probe',
    description: `📦 Proceso: Monitorización y dependencias de persistencia
🔧 Funcionalidad: Verifica conectividad contra PostgreSQL y valida que las migraciones de hardening estén completamente aplicadas.`,
  })
  @ApiZodOk(healthStatusResponseDto)
  @ApiServiceUnavailableResponse({ description: 'Database unavailable or schema migrations incomplete' })
  async ready() {
    try {
      const result = await pool.query<{ ready: boolean }>(
        "SELECT is_schema_ready('012_v6_senior_hardening.sql') AS ready",
      );
      if (!result.rowCount || !result.rows[0]?.ready) {
        throw new Error('Schema not migrated to 012_v6_senior_hardening.sql');
      }
      return { status: 'ready' as const };
    } catch {
      throw new ServiceUnavailableException('Database unavailable');
    }
  }
}

@Module({
  imports: [
    AppConfigModule,
    StructuredLoggerModule,
    KnowledgeModule,
    GovernanceModule,
    ConversationsModule,
    EvaluationsModule,
    UploadsModule,
  ],
  controllers: [HealthController, MetricsController],
  providers: [
    { provide: APP_INTERCEPTOR, useClass: MetricsInterceptor },
    { provide: APP_FILTER, useClass: DatabaseExceptionFilter },
  ],
})
export class AppModule implements OnApplicationShutdown {
  async onApplicationShutdown(): Promise<void> {
    await closePool();
  }
}
