import { describe, expect, it, vi } from 'vitest';
import type {
  ObjectStoragePort,
  UploadsRepositoryPort,
} from '../../src/modules/uploads/application/ports/uploads-repository.port';
import { UploadsService } from '../../src/modules/uploads/application/services/uploads.service';
import type { UploadedMemoryFile } from '../../src/modules/uploads/domain/upload-envelope';

describe('UploadsService upload and versioning pipeline', () => {
  const sampleFile: UploadedMemoryFile = {
    originalname: 'document_v1.pdf',
    mimetype: 'application/pdf',
    size: 2048,
    buffer: Buffer.from('%PDF-1.4 sample content'),
  };

  it('rejects missing file in uploadDocument', async () => {
    const repo = {} as UploadsRepositoryPort;
    const storage = {} as ObjectStoragePort;
    const service = new UploadsService(repo, storage);
    await expect(service.uploadDocument('user-1', 'kb-1', undefined, {})).rejects.toThrow('File is required');
  });

  it('uploads document to quarantine and persists in repository', async () => {
    const repo: UploadsRepositoryPort = {
      assertCanUploadToKnowledgeBase: vi.fn().mockResolvedValue(undefined),
      persistUploadedDocument: vi.fn().mockResolvedValue({ id: 'doc-1', status: 'pending' }),
      assertCanVersionDocument: vi.fn(),
      persistNewDocumentVersion: vi.fn(),
      getAuthorizedDownloadTarget: vi.fn(),
      reverifyAuthorizedDownloadTarget: vi.fn(),
    };
    const storage: ObjectStoragePort = {
      storePrivateObject: vi.fn().mockResolvedValue(undefined),
      retrievePrivateObject: vi.fn(),
      removePrivateObject: vi.fn().mockResolvedValue(undefined),
    };

    const service = new UploadsService(repo, storage);
    const result = await service.uploadDocument('user-1', 'kb-1', sampleFile, {
      title: 'Manual de Políticas',
      visibility: 'tenant',
    });

    expect(result.id).toBe('doc-1');
    expect(repo.assertCanUploadToKnowledgeBase).toHaveBeenCalledWith('user-1', 'kb-1');
    expect(storage.storePrivateObject).toHaveBeenCalled();
    expect(repo.persistUploadedDocument).toHaveBeenCalled();
  });

  it('removes quarantined storage object if repository persistence fails', async () => {
    const repo: UploadsRepositoryPort = {
      assertCanUploadToKnowledgeBase: vi.fn().mockResolvedValue(undefined),
      persistUploadedDocument: vi.fn().mockRejectedValue(new Error('Database lock error')),
      assertCanVersionDocument: vi.fn(),
      persistNewDocumentVersion: vi.fn(),
      getAuthorizedDownloadTarget: vi.fn(),
      reverifyAuthorizedDownloadTarget: vi.fn(),
    };
    const storage: ObjectStoragePort = {
      storePrivateObject: vi.fn().mockResolvedValue(undefined),
      retrievePrivateObject: vi.fn(),
      removePrivateObject: vi.fn().mockResolvedValue(undefined),
    };

    const service = new UploadsService(repo, storage);
    await expect(
      service.uploadDocument('user-1', 'kb-1', sampleFile, {
        title: 'Documento',
        visibility: 'private',
      }),
    ).rejects.toThrow('Database lock error');

    expect(storage.removePrivateObject).toHaveBeenCalled();
  });

  it('uploads new version via file and via text content', async () => {
    const repo: UploadsRepositoryPort = {
      assertCanUploadToKnowledgeBase: vi.fn(),
      persistUploadedDocument: vi.fn(),
      assertCanVersionDocument: vi.fn().mockResolvedValue(undefined),
      persistNewDocumentVersion: vi.fn().mockResolvedValue({ id: 'doc-1', version: 2, status: 'pending' }),
      getAuthorizedDownloadTarget: vi.fn(),
      reverifyAuthorizedDownloadTarget: vi.fn(),
    };
    const storage: ObjectStoragePort = {
      storePrivateObject: vi.fn().mockResolvedValue(undefined),
      retrievePrivateObject: vi.fn(),
      removePrivateObject: vi.fn(),
    };

    const service = new UploadsService(repo, storage);

    // 1. File version
    const fileVer = await service.uploadNewVersion('user-1', 'doc-1', sampleFile, { title: 'v2' });
    expect(fileVer.version).toBe(2);

    // 2. Text version
    const textVer = await service.uploadNewVersion('user-1', 'doc-1', undefined, {
      title: 'v3',
      text: 'Texto actualizado de la política.',
    });
    expect(textVer.version).toBe(2);
    expect(repo.persistNewDocumentVersion).toHaveBeenCalledWith(
      expect.objectContaining({
        media_type: 'text/plain',
        text: 'Texto actualizado de la política.',
      }),
    );
  });

  it('downloads authorized document with sanitized filename and aborts on mid-download revocation', async () => {
    const repo: UploadsRepositoryPort = {
      assertCanUploadToKnowledgeBase: vi.fn(),
      persistUploadedDocument: vi.fn(),
      assertCanVersionDocument: vi.fn(),
      persistNewDocumentVersion: vi.fn(),
      getAuthorizedDownloadTarget: vi.fn().mockResolvedValue({
        file_path: 'clean/doc-1/v1.pdf',
        original_filename: 'Políticas 2026!?.pdf',
        media_type: 'application/pdf',
      }),
      reverifyAuthorizedDownloadTarget: vi.fn().mockResolvedValue(true),
    };
    const storage: ObjectStoragePort = {
      storePrivateObject: vi.fn(),
      retrievePrivateObject: vi.fn().mockResolvedValue(Buffer.from('PDF_BYTES')),
      removePrivateObject: vi.fn(),
    };

    const service = new UploadsService(repo, storage);
    const download = await service.downloadAuthorizedDocument('user-1', 'doc-1');
    expect(download.filename).toBe('Pol_ticas_2026__.pdf');
    expect(download.body.toString()).toBe('PDF_BYTES');

    // Revocation simulation
    vi.mocked(repo.reverifyAuthorizedDownloadTarget).mockResolvedValueOnce(false);
    await expect(service.downloadAuthorizedDocument('user-1', 'doc-1')).rejects.toThrow(
      'Document permissions changed during download',
    );
  });
});
