import { createHash, randomUUID } from 'node:crypto';
import { basename } from 'node:path';
import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { MAX_DOCUMENT_TITLE_LENGTH, MAX_ORIGINAL_FILENAME_LENGTH } from '../../const/uploads.const';
import { type UploadedMemoryFile, validateUploadEnvelope } from '../../domain/upload-envelope';
import {
  textVersionRequestDto,
  uploadMetadataRequestDto,
} from '../../presentation/http/dto/upload-metadata.request.dto';
import {
  OBJECT_STORAGE_PORT,
  type ObjectStoragePort,
  UPLOADS_REPOSITORY,
  type UploadsRepositoryPort,
} from '../ports/uploads-repository.port';

@Injectable()
export class UploadsService {
  constructor(
    @Inject(UPLOADS_REPOSITORY) private readonly repository: UploadsRepositoryPort,
    @Inject(OBJECT_STORAGE_PORT) private readonly objectStoragePort: ObjectStoragePort,
  ) {}

  async uploadDocument(
    actor_sub: string,
    knowledge_base_id: string,
    file: UploadedMemoryFile | undefined,
    raw_body: Record<string, unknown>,
  ): Promise<{ id: string; status: string }> {
    if (!file) {
      throw new BadRequestException('File is required');
    }
    validateUploadEnvelope(file);
    const parsed = uploadMetadataRequestDto.safeParse({
      title:
        typeof raw_body?.title === 'string' && raw_body.title.trim()
          ? raw_body.title
          : basename(file.originalname),
      visibility: typeof raw_body?.visibility === 'string' ? raw_body.visibility : 'private',
    });
    if (!parsed.success) {
      throw new BadRequestException('Invalid document title or visibility');
    }

    await this.repository.assertCanUploadToKnowledgeBase(actor_sub, knowledge_base_id);
    const key = `quarantine/${randomUUID()}`;
    const media_type = file.mimetype || 'application/octet-stream';
    await this.objectStoragePort.storePrivateObject(key, file.buffer, media_type);

    try {
      const sha256 = createHash('sha256').update(file.buffer).digest('hex');
      return await this.repository.persistUploadedDocument({
        sub: actor_sub,
        kb_id: knowledge_base_id,
        title: parsed.data.title,
        visibility: parsed.data.visibility,
        original_filename: basename(file.originalname).slice(0, MAX_ORIGINAL_FILENAME_LENGTH),
        media_type,
        object_key: key,
        sha256,
        byte_size: file.size,
      });
    } catch (error) {
      await this.objectStoragePort.removePrivateObject(key).catch(() => {});
      throw error;
    }
  }

  async uploadNewVersion(
    actor_sub: string,
    document_id: string,
    file: UploadedMemoryFile | undefined,
    raw_body: Record<string, unknown>,
  ): Promise<{ id: string; version: number; status: string }> {
    await this.repository.assertCanVersionDocument(actor_sub, document_id);

    if (file) {
      validateUploadEnvelope(file);
      const optionalTitle =
        typeof raw_body?.title === 'string' && raw_body.title.trim()
          ? raw_body.title.trim().slice(0, MAX_DOCUMENT_TITLE_LENGTH)
          : undefined;
      const key = `quarantine/${randomUUID()}`;
      const media_type = file.mimetype || 'application/octet-stream';
      await this.objectStoragePort.storePrivateObject(key, file.buffer, media_type);
      try {
        const sha256 = createHash('sha256').update(file.buffer).digest('hex');
        return await this.repository.persistNewDocumentVersion({
          sub: actor_sub,
          document_id,
          title: optionalTitle,
          original_filename: basename(file.originalname).slice(0, MAX_ORIGINAL_FILENAME_LENGTH),
          media_type,
          object_key: key,
          sha256,
          byte_size: file.size,
        });
      } catch (error) {
        await this.objectStoragePort.removePrivateObject(key).catch(() => {});
        throw error;
      }
    }

    const parsedText = textVersionRequestDto.safeParse({
      title: typeof raw_body?.title === 'string' && raw_body.title.trim() ? raw_body.title : undefined,
      text: raw_body?.text,
    });
    if (!parsedText.success) {
      throw new BadRequestException('Either a valid file upload or non-empty text body is required');
    }

    const sha256 = createHash('sha256').update(parsedText.data.text, 'utf8').digest('hex');
    const byte_size = Buffer.byteLength(parsedText.data.text, 'utf8');
    return this.repository.persistNewDocumentVersion({
      sub: actor_sub,
      document_id,
      title: parsedText.data.title,
      text: parsedText.data.text,
      original_filename: null,
      media_type: 'text/plain',
      object_key: null,
      sha256,
      byte_size,
    });
  }

  async downloadAuthorizedDocument(
    actor_sub: string,
    document_id: string,
  ): Promise<{ body: Buffer; filename: string }> {
    const target = await this.repository.getAuthorizedDownloadTarget(actor_sub, document_id);
    const body = await this.objectStoragePort.retrievePrivateObject(target.file_path);
    const stillAllowed = await this.repository.reverifyAuthorizedDownloadTarget(
      actor_sub,
      document_id,
      target.file_path,
    );
    if (!stillAllowed) {
      throw new NotFoundException('Document permissions changed during download');
    }
    const safeFilename = (target.original_filename ?? 'document').replace(/[^a-zA-Z0-9._-]/g, '_');
    return { body, filename: safeFilename };
  }
}
