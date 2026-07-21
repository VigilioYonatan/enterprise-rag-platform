import type { DocumentVisibilitySchema } from '../../knowledge/domain/schemas/document.schema';

export interface UploadedMemoryFile {
  originalname: string;
  buffer: Buffer;
  size: number;
  mimetype?: string;
}

export interface CreateUploadedDocumentParams {
  sub: string;
  kb_id: string;
  title: string;
  visibility: DocumentVisibilitySchema;
  original_filename: string;
  media_type: string;
  object_key: string;
  sha256: string;
  byte_size: number;
}

export interface CreateNewVersionParams {
  sub: string;
  document_id: string;
  title?: string;
  text?: string;
  original_filename?: string | null;
  media_type: string;
  object_key: string | null;
  sha256: string;
  byte_size: number;
}
