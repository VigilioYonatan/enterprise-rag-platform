import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  request: vi.fn(),
  downloadDocument: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('~/auth/auth-context', () => ({
  useActorKey: () => 'u-owner',
  useAuth: () => ({
    user: { expired: false, profile: { sub: 'u-owner', email: 'owner@enterprise.local' } },
    actorKey: 'u-owner',
    loading: false,
    refresh: vi.fn(),
  }),
}));

vi.mock('~/services/api', () => ({
  api: (path: string, init?: RequestInit) => mocks.request(path, init),
  apiList: async (path: string, init?: RequestInit) => {
    const res = await mocks.request(path, init);
    return Array.isArray(res) ? res : res.results;
  },
  apiPaginated: async (path: string, init?: RequestInit) => {
    const res = await mocks.request(path, init);
    return Array.isArray(res) ? { count: res.length, next: null, previous: null, results: res } : res;
  },
  downloadDocument: (...args: unknown[]) => mocks.downloadDocument(...args),
}));

import { DocumentDetailPage } from '@/documents/pages/document-detail-page';
import { DocumentPage } from '@/documents/pages/document-page';

const TENANT_ID = '11111111-1111-4111-8111-111111111111';
const KB_ID = '22222222-2222-4222-8222-222222222222';
const DOC_ID = '33333333-3333-4333-8333-333333333333';
const GROUP_ID = '44444444-4444-4444-8444-444444444444';

describe('DocumentPage & DocumentDetailPage', () => {
  beforeEach(() => {
    mocks.request.mockReset();
    mocks.downloadDocument.mockClear();
  });

  it('uploads binary files into quarantine and indexes inline text documents in DocumentPage', async () => {
    mocks.request.mockImplementation(async (path: string, init?: RequestInit) => {
      if (path.startsWith(`/knowledge-bases/${KB_ID}/documents?`)) {
        return {
          count: 1,
          next: `/api/v1/knowledge-bases/${KB_ID}/documents?limit=20&offset=20`,
          previous: null,
          results: [
            {
              id: DOC_ID,
              title: 'Manual Zero Trust',
              visibility: 'private',
              status: 'ready',
              created_at: new Date().toISOString(),
            },
          ],
        };
      }
      if (path === `/knowledge-bases/${KB_ID}/uploads` && init?.method === 'POST') {
        return { id: DOC_ID, status: 'queued' };
      }
      if (path === `/knowledge-bases/${KB_ID}/documents` && init?.method === 'POST') {
        return { id: 'doc-txt', status: 'queued' };
      }
      throw new Error(`Unexpected ${path}`);
    });

    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <MemoryRouter initialEntries={[`/app/knowledge/${KB_ID}`]}>
          <Routes>
            <Route path="/app/knowledge/:id" element={<DocumentPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(await screen.findByText('Manual Zero Trust')).toBeInTheDocument();

    // File upload mode
    const fileInput = screen.getByLabelText(/Archivo \(PDF, DOCX/i);
    const pdfFile = new File(['%PDF-1.4 content'], 'politica.pdf', { type: 'application/pdf' });
    fireEvent.change(fileInput, { target: { files: [pdfFile] } });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar archivo a ingesta' }));

    await waitFor(() =>
      expect(
        mocks.request.mock.calls.some(
          ([p, i]) => p === `/knowledge-bases/${KB_ID}/uploads` && i?.method === 'POST',
        ),
      ).toBe(true),
    );

    // Switch to text mode and submit text document
    fireEvent.click(screen.getByRole('button', { name: /Pegar texto/i }));
    fireEvent.change(screen.getByLabelText('Título'), { target: { value: 'Nota rápida' } });
    fireEvent.change(screen.getByLabelText('Contenido'), {
      target: { value: 'Contenido normativo interno.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Indexar texto' }));

    await waitFor(() =>
      expect(
        mocks.request.mock.calls.some(
          ([p, i]) => p === `/knowledge-bases/${KB_ID}/documents` && i?.method === 'POST',
        ),
      ).toBe(true),
    );
  });

  it('manages versions, binary downloads, user/group ACL grants, and deletion in DocumentDetailPage', async () => {
    mocks.request.mockImplementation(async (path: string, init?: RequestInit) => {
      if (path === `/documents/${DOC_ID}` && !init?.method) {
        return {
          id: DOC_ID,
          tenant_id: TENANT_ID,
          knowledge_base_id: KB_ID,
          title: 'Manual Zero Trust',
          visibility: 'private',
          status: 'ready',
          version: 1,
          owner_sub: 'u-owner',
          original_filename: 'manual.pdf',
          media_type: 'application/pdf',
          byte_size: 4096,
        };
      }
      if (path.startsWith(`/documents/${DOC_ID}/chunks?`)) {
        return [{ id: 'ch-1', ordinal: 0, content: 'Fragmento confidencial', document_version: 1 }];
      }
      if (path.startsWith(`/documents/${DOC_ID}/versions?`)) {
        return [
          {
            id: 'v-1',
            version: 1,
            sha256: 'a'.repeat(64),
            media_type: 'application/pdf',
            original_filename: 'manual.pdf',
            created_at: new Date().toISOString(),
          },
        ];
      }
      if (path === `/documents/${DOC_ID}/access` && !init?.method) {
        return [];
      }
      if (path === `/documents/${DOC_ID}/access` && init?.method === 'PUT') {
        return { document_id: DOC_ID, granted_users: 1 };
      }
      if (path.startsWith(`/tenants/${TENANT_ID}/members?`)) {
        return [
          { user_sub: 'u-owner', email: 'owner@enterprise.local', role: 'owner' },
          { user_sub: 'u-peer', email: 'peer@enterprise.local', role: 'viewer' },
        ];
      }
      if (path.startsWith(`/tenants/${TENANT_ID}/groups?`)) {
        return [{ id: GROUP_ID, name: 'Auditoría', member_count: 2 }];
      }
      if (path === `/documents/${DOC_ID}/group-access` && !init?.method) {
        return [];
      }
      if (path === `/documents/${DOC_ID}/group-access` && init?.method === 'PUT') {
        return { document_id: DOC_ID, group_count: 1 };
      }
      if (path === `/documents/${DOC_ID}/versions` && init?.method === 'POST') {
        return { id: DOC_ID, version: 2, status: 'queued' };
      }
      if (path === `/documents/${DOC_ID}` && init?.method === 'DELETE') {
        return { deleted: true };
      }
      throw new Error(`Unexpected ${path}`);
    });

    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <MemoryRouter initialEntries={[`/app/documents/${DOC_ID}`]}>
          <Routes>
            <Route path="/app/documents/:id" element={<DocumentDetailPage />} />
            <Route path="/app/knowledge/:id" element={<div>Regreso KB</div>} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(await screen.findByText('Fragmento confidencial')).toBeInTheDocument();
    expect(screen.getByText('4.0 KiB')).toBeInTheDocument();

    // Download clean document
    fireEvent.click(screen.getByRole('button', { name: 'Descargar original' }));
    await waitFor(() => expect(mocks.downloadDocument).toHaveBeenCalledWith(DOC_ID, 'manual.pdf'));

    // Grant user access
    const peerCheckbox = await screen.findByLabelText(/peer@enterprise\.local/i);
    fireEvent.click(peerCheckbox);
    fireEvent.click(screen.getByRole('button', { name: 'Guardar permisos' }));
    await waitFor(() =>
      expect(
        mocks.request.mock.calls.some(([p, i]) => p === `/documents/${DOC_ID}/access` && i?.method === 'PUT'),
      ).toBe(true),
    );

    // Grant group access
    const groupCheckbox = await screen.findByLabelText(/Auditoría \(2\)/i);
    fireEvent.click(groupCheckbox);
    fireEvent.click(screen.getByRole('button', { name: 'Guardar grupos' }));
    await waitFor(() =>
      expect(
        mocks.request.mock.calls.some(
          ([p, i]) => p === `/documents/${DOC_ID}/group-access` && i?.method === 'PUT',
        ),
      ).toBe(true),
    );

    // Publish new text version
    fireEvent.click(screen.getByRole('button', { name: 'Texto' }));
    fireEvent.change(screen.getByLabelText('Nuevo contenido textual'), {
      target: { value: 'Versión 2 actualizada con controles.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Subir versión v2' }));
    await waitFor(() =>
      expect(
        mocks.request.mock.calls.some(
          ([p, i]) => p === `/documents/${DOC_ID}/versions` && i?.method === 'POST',
        ),
      ).toBe(true),
    );

    // Delete document
    fireEvent.click(screen.getByRole('button', { name: 'Eliminar documento' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar eliminación' }));
    expect(await screen.findByText('Regreso KB')).toBeInTheDocument();
  });
});
