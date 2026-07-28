import { Module } from '@nestjs/common';
import { KnowledgeModule } from '../knowledge/knowledge.module';
import { CONVERSATIONS_REPOSITORY } from './application/ports/conversations-repository.port';
import { ConversationsService } from './application/services/conversations.service';
import { PostgresConversationsRepository } from './infrastructure/persistence/conversations.repository';
import { ConversationsController } from './presentation/http/controllers/conversations.controller';

@Module({
  imports: [KnowledgeModule],
  controllers: [ConversationsController],
  providers: [
    ConversationsService,
    { provide: CONVERSATIONS_REPOSITORY, useClass: PostgresConversationsRepository },
  ],
})
export class ConversationsModule {}
