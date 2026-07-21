import type {
  DocumentVersionCreatedResponseDto,
  UploadedDocumentResponseDto,
} from '../../presentation/http/dto/uploads.dto';
import type {
  CreateNewVersionParams,
  CreateUploadedDocumentParams,
  UploadedMemoryFile,
} from '../../types/uploads.type';

export type { CreateNewVersionParams, CreateUploadedDocumentParams, UploadedMemoryFile };

export interface UploadsRepositoryPort {
  assertCanUploadToKnowledgeBase(actor_sub: string, kb_id: string): Promise<void>;
  assertCanVersionDocument(actor_sub: string, document_id: string): Promise<{ tenant_id: string }>;
  persistUploadedDocument(params: CreateUploadedDocumentParams): Promise<UploadedDocumentResponseDto>;
  persistNewDocumentVersion(params: CreateNewVersionParams): Promise<DocumentVersionCreatedResponseDto>;
  getAuthorizedDownloadTarget(
    actor_sub: string,
    document_id: string,
  ): Promise<{ file_path: string; original_filename: string | null; media_type: string | null }>;
  reverifyAuthorizedDownloadTarget(
    actor_sub: string,
    document_id: string,
    file_path: string,
  ): Promise<boolean>;
}

export interface ObjectStoragePort {
  storePrivateObject(key: string, body: Buffer, mediaType: string): Promise<void>;
  retrievePrivateObject(key: string): Promise<Buffer>;
  removePrivateObject(key: string): Promise<void>;
}

export const UPLOADS_REPOSITORY = Symbol('UPLOADS_REPOSITORY');
export const OBJECT_STORAGE_PORT = Symbol('OBJECT_STORAGE_PORT');
