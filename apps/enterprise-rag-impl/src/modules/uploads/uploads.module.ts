import { Module } from '@nestjs/common';
import { OBJECT_STORAGE_PORT, UPLOADS_REPOSITORY } from './application/ports/uploads-repository.port';
import { UploadsService } from './application/services/uploads.service';
import {
  PostgresUploadsRepository,
  RustFsObjectStorageAdapter,
} from './infrastructure/persistence/uploads.repository';
import { UploadsController } from './presentation/http/controllers/uploads.controller';

@Module({
  controllers: [UploadsController],
  providers: [
    UploadsService,
    { provide: UPLOADS_REPOSITORY, useClass: PostgresUploadsRepository },
    { provide: OBJECT_STORAGE_PORT, useClass: RustFsObjectStorageAdapter },
  ],
})
export class UploadsModule {}
