import {
  Controller,
  Get,
  Inject,
  Param,
  Post,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOkResponse,
  ApiOperation,
  ApiProduces,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { z } from 'zod';
import { UploadsService } from '@/uploads/application/services/uploads.service';
import {
  MAX_UPLOAD_BYTES,
  type UploadedMemoryFile,
  validateUploadEnvelope,
} from '@/uploads/domain/upload-envelope';
import {
  documentVersionCreatedResponseDto,
  uploadedDocumentResponseDto,
} from '@/uploads/presentation/http/dto/uploads.dto';
import { ApiZodCreated, ApiZodStandardErrors } from '~/openapi/zod-decorators';
import { type Actor, CurrentActor } from '~/security/actor';
import { JwtGuard } from '~/security/jwt.guard';
import { ZodPipe } from '~/shared/validation.pipe';

export { validateUploadEnvelope };

@ApiTags('Uploads')
@ApiBearerAuth()
@ApiZodStandardErrors()
@UseGuards(JwtGuard)
@Controller('api/v1')
export class UploadsController {
  constructor(@Inject(UploadsService) private readonly uploadsService: UploadsService) {}

  @Post('knowledge-bases/:id/uploads')
  @ApiOperation({
    operationId: 'uploadDocumentFile',
    summary: 'Upload binary/text document into quarantine and queue ClamAV + indexing',
    description: `📦 Proceso: Ingesta segura de archivos binarios/documentos
🔧 Funcionalidad: Almacena en cuarentena cifrada S3/RustFS, ejecuta escaneo antivirus ClamAV asíncrono y encola extracción de texto y vectorización.`,
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: { type: 'string', format: 'binary' },
        title: { type: 'string', maxLength: 180 },
        visibility: { type: 'string', enum: ['private', 'tenant'] },
      },
    },
  })
  @ApiZodCreated(uploadedDocumentResponseDto)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_UPLOAD_BYTES, files: 1, fields: 3 } }))
  uploadDocumentFile(
    @CurrentActor() actor: Actor,
    @Param('id', new ZodPipe(z.uuid())) knowledgeBaseId: string,
    @UploadedFile() file: UploadedMemoryFile | undefined,
    @Req() req: { body: Record<string, unknown> },
  ) {
    return this.uploadsService.uploadDocument(actor.sub, knowledgeBaseId, file, req.body ?? {});
  }

  @Post('documents/:id/versions')
  @ApiOperation({
    operationId: 'createDocumentVersion',
    summary: 'Upload a new version (file or text) for an existing document, invalidating prior citations',
    description: `📦 Proceso: Versionado documental inmutable
🔧 Funcionalidad: Crea una nueva versión de un documento existente invalidando citaciones obsoletas e iniciando vectorización de la nueva versión.`,
  })
  @ApiConsumes('multipart/form-data', 'application/json')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        title: { type: 'string', maxLength: 180 },
        text: { type: 'string', maxLength: 100000 },
      },
    },
  })
  @ApiZodCreated(documentVersionCreatedResponseDto)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_UPLOAD_BYTES, files: 1, fields: 3 } }))
  createDocumentVersionFile(
    @CurrentActor() actor: Actor,
    @Param('id', new ZodPipe(z.uuid())) documentId: string,
    @UploadedFile() file: UploadedMemoryFile | undefined,
    @Req() req: { body: Record<string, unknown> },
  ) {
    return this.uploadsService.uploadNewVersion(actor.sub, documentId, file, req.body ?? {});
  }

  @Get('documents/:id/download')
  @ApiOperation({
    operationId: 'downloadDocumentFile',
    summary: 'Download clean binary document with post-I/O ACL re-verification',
    description: `📦 Proceso: Descarga de artefactos documentales limpios
🔧 Funcionalidad: Transmite el binario desde RustFS/S3 validando verificación antivirus exitosa y permisos vigentes del usuario.`,
  })
  @ApiProduces('application/octet-stream')
  @ApiOkResponse({
    description: 'Authorized binary document stream',
    content: {
      'application/octet-stream': {
        schema: { type: 'string', format: 'binary' },
      },
    },
  })
  async downloadDocumentFile(
    @CurrentActor() actor: Actor,
    @Param('id', new ZodPipe(z.uuid())) documentId: string,
    @Res() res: Response,
  ) {
    const { body, filename } = await this.uploadsService.downloadAuthorizedDocument(actor.sub, documentId);
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    if (typeof (res as unknown as { send?: (payload: unknown) => void }).send === 'function') {
      (res as unknown as { send: (payload: unknown) => void }).send(body);
    } else {
      res.end(body);
    }
  }

  // --- Backward compatibility aliases ---
  upload(
    actor: Actor,
    knowledgeBaseId: string,
    file: UploadedMemoryFile | undefined,
    req: { body: Record<string, unknown> },
  ) {
    return this.uploadDocumentFile(actor, knowledgeBaseId, file, req);
  }
  uploadVersion(
    actor: Actor,
    documentId: string,
    file: UploadedMemoryFile | undefined,
    req: { body: Record<string, unknown> },
  ) {
    return this.createDocumentVersionFile(actor, documentId, file, req);
  }
  download(actor: Actor, documentId: string, res: Response) {
    return this.downloadDocumentFile(actor, documentId, res);
  }
}
