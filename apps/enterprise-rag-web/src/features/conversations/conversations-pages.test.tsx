import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  request: vi.fn(),
  streamConversationMessage: vi.fn(),
}));

vi.mock('~/auth/auth-context', () => ({
  useActorKey: () => 'u1',
}));

vi.mock('~/services/api', () => ({
  api: (path: string, init?: RequestInit) => mocks.request(path, init),
  apiList: async (path: string, init?: RequestInit) => {
    const res = await mocks.request(path, init);
    return Array.isArray(res) ? res : res.results;
  },
  streamConversationMessage: (...args: unknown[]) => mocks.streamConversationMessage(...args),
}));

import { ConversationDetailPage } from '@/conversations/pages/conversation-detail-page';
import { ConversationsPage } from '@/conversations/pages/conversations-page';

const TENANT_ID = '11111111-1111-4111-8111-111111111111';
const KB_ID = '22222222-2222-4222-8222-222222222222';
const CONV_ID = '33333333-3333-4333-8333-333333333333';
const CIT_ID = '44444444-4444-4444-8444-444444444444';

describe('ConversationsPage & ConversationDetailPage', () => {
  beforeEach(() => {
    mocks.request.mockReset();
    mocks.streamConversationMessage.mockReset();
  });

  it('lists, creates, and deletes conversations via ConfirmDialog', async () => {
    mocks.request.mockImplementation(async (path: string, init?: RequestInit) => {
      if (path === '/tenants') return [{ id: TENANT_ID, name: 'Org Uno' }];
      if (path.startsWith('/knowledge-bases?')) return [{ id: KB_ID, name: 'KB Seguridad' }];
      if (path.startsWith('/conversations?')) {
        return [{ id: CONV_ID, knowledge_base_id: KB_ID, title: 'Revisión ISO 27001' }];
      }
      if (path === '/conversations' && init?.method === 'POST') {
        return { id: 'new-conv', knowledge_base_id: KB_ID, title: 'Nueva sesión' };
      }
      if (path === `/conversations/${CONV_ID}` && init?.method === 'DELETE') {
        return undefined;
      }
      throw new Error(`Unexpected ${path}`);
    });

    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <MemoryRouter initialEntries={['/app/conversations']}>
          <ConversationsPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(await screen.findByText('Revisión ISO 27001')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Título de la conversación'), {
      target: { value: 'Nueva sesión' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Crear conversación' }));

    await waitFor(() =>
      expect(mocks.request.mock.calls.some(([p, i]) => p === '/conversations' && i?.method === 'POST')).toBe(
        true,
      ),
    );

    fireEvent.click(screen.getByRole('button', { name: /Eliminar conversación Revisión ISO 27001/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar eliminación' }));

    await waitFor(() =>
      expect(
        mocks.request.mock.calls.some(
          ([p, i]) => p === `/conversations/${CONV_ID}` && i?.method === 'DELETE',
        ),
      ).toBe(true),
    );
  });

  it('renders conversation turns, resolves live citations, handles revoked citations, and streams new questions', async () => {
    let citationRevoked = false;
    mocks.request.mockImplementation(async (path: string, init?: RequestInit) => {
      if (path === `/conversations/${CONV_ID}` && !init?.method) {
        return {
          id: CONV_ID,
          title: 'Revisión ISO 27001',
          messages: [
            { id: 'm1', role: 'user', content: '¿Qué exige la política?', abstained: false, citations: [] },
            {
              id: 'm2',
              role: 'assistant',
              content: 'Exige MFA obligatorio [1].',
              abstained: false,
              citations: [{ id: CIT_ID, reference_index: 1, title: 'Política MFA', document_id: 'doc-1' }],
            },
          ],
        };
      }
      if (path === `/conversations/${CONV_ID}/citations/${CIT_ID}`) {
        if (citationRevoked) throw new Error('Citation expired or access revoked');
        return {
          id: CIT_ID,
          reference_index: 1,
          title: 'Política MFA',
          content: 'Todo acceso requiere MFA.',
        };
      }
      if (path === `/conversations/${CONV_ID}` && init?.method === 'DELETE') {
        return undefined;
      }
      throw new Error(`Unexpected ${path}`);
    });

    mocks.streamConversationMessage.mockImplementation(
      async (
        _cid: string,
        _q: string,
        _sig: AbortSignal,
        onEvent: (f: { event: string; data: unknown }) => void,
      ) => {
        onEvent({ event: 'status', data: { phase: 'retrieval' } });
        onEvent({ event: 'complete', data: { answer: 'Listo [1].' } });
      },
    );

    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <MemoryRouter initialEntries={[`/app/conversations/${CONV_ID}`]}>
          <Routes>
            <Route path="/app/conversations/:id" element={<ConversationDetailPage />} />
            <Route path="/app/conversations" element={<div>Listado Conversaciones</div>} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(await screen.findByText('Exige MFA obligatorio [1].')).toBeInTheDocument();

    // Inspect active citation
    fireEvent.click(screen.getByRole('button', { name: '[1] Política MFA' }));
    expect(await screen.findByText('Todo acceso requiere MFA.')).toBeInTheDocument();

    // Inspect revoked citation
    citationRevoked = true;
    fireEvent.click(screen.getByRole('button', { name: '[1] Política MFA' }));
    expect(await screen.findByText(/Citation expired or access revoked/i)).toBeInTheDocument();

    // Send streaming question
    fireEvent.change(screen.getByLabelText('Pregunta a tu base'), {
      target: { value: '¿Y para proveedores externos?' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar pregunta' }));
    await waitFor(() => expect(mocks.streamConversationMessage).toHaveBeenCalledOnce());

    // Delete conversation
    fireEvent.click(screen.getByRole('button', { name: /Eliminar conversación/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar eliminación' }));
    expect(await screen.findByText('Listado Conversaciones')).toBeInTheDocument();
  });
});
