import { Module } from '@nestjs/common';
import { KnowledgeModule } from '../knowledge/knowledge.module';
import { EVALUATIONS_REPOSITORY } from './application/ports/evaluations-repository.port';
import { EvaluationsService } from './application/services/evaluations.service';
import { PostgresEvaluationsRepository } from './infrastructure/persistence/evaluations.repository';
import { EvaluationsController } from './presentation/http/controllers/evaluations.controller';

@Module({
  imports: [KnowledgeModule],
  controllers: [EvaluationsController],
  providers: [
    EvaluationsService,
    { provide: EVALUATIONS_REPOSITORY, useClass: PostgresEvaluationsRepository },
  ],
})
export class EvaluationsModule {}
