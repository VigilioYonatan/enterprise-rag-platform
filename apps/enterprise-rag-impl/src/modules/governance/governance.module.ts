import { Module } from '@nestjs/common';
import { GOVERNANCE_REPOSITORY } from './application/ports/governance-repository.port';
import { GovernanceService } from './application/services/governance.service';
import { PostgresGovernanceRepository } from './infrastructure/persistence/governance.repository';
import { GovernanceController } from './presentation/http/controllers/governance.controller';

@Module({
  controllers: [GovernanceController],
  providers: [GovernanceService, { provide: GOVERNANCE_REPOSITORY, useClass: PostgresGovernanceRepository }],
})
export class GovernanceModule {}
