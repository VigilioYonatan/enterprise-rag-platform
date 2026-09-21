import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AssistantPage } from '@/chat/pages/assistant-page';
import * as api from '~/services/api';

vi.mock('~/auth/auth-context', () => ({
  useActorKey: () => 'actor-test-sub',
}));

vi.mock('~/services/api', () => ({
  api: vi.fn(),
  apiList: vi.fn(),
  streamAnswer: vi.fn(),
}));

function renderWithClient(ui: ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('AssistantPage Interactive Query & Retrieval', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders mode switch and loads available tenants and knowledge bases', async () => {
    vi.mocked(api.apiList).mockImplementation(async (path: string) => {
      if (path.startsWith('/tenants')) {
        return [{ id: 't1', name: 'Org Central' }];
      }
      if (path.startsWith('/knowledge-bases')) {
        return [{ id: 'kb1', tenant_id: 't1', name: 'Manuales' }];
      }
      return [];
    });

    renderWithClient(<AssistantPage />);

    expect(
      screen.getByRole('heading', { level: 1, name: 'Búsqueda y respuesta con evidencias' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Respuesta sustentada \(SSE\)/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Solo búsqueda híbrida/i })).toBeInTheDocument();

    // Toggle mode to pure search
    const searchModeBtn = screen.getByRole('button', { name: /Solo búsqueda híbrida/i });
    fireEvent.click(searchModeBtn);
    expect(searchModeBtn).toHaveAttribute('aria-pressed', 'true');
  });

  it('executes SSE grounded answer with citations, hybrid search chunks, and surfaces errors', async () => {
    vi.mocked(api.apiList).mockImplementation(async (path: string) => {
      if (path.startsWith('/tenants')) return [{ id: 't1', name: 'Org Central' }];
      if (path.startsWith('/knowledge-bases')) return [{ id: 'kb1', tenant_id: 't1', name: 'Manuales' }];
      return [];
    });

    vi.mocked(api.streamAnswer).mockImplementation(async (_input, _sig, onEvent) => {
      onEvent({ event: 'status', data: { phase: 'authorized' } });
      onEvent({ event: 'status', data: { phase: 'retrieval' } });
      onEvent({ event: 'status', data: { phase: 'generation' } });
      onEvent({
        event: 'complete',
        data: {
          answer: 'El acceso usa PostgreSQL RLS [1].',
          abstained: false,
          citations: [
            {
              index: 1,
              document_id: 'doc-1',
              chunk_id: 'chunk-12345678',
              document_version: 2,
              title: 'Política Zero Trust',
            },
          ],
        },
      });
    });

    vi.mocked(api.api).mockResolvedValue([
      {
        chunk_id: 'chunk-12345678',
        document_id: 'doc-1',
        document_version: 2,
        title: 'Política Zero Trust',
        content: 'Fragmento verificado con RLS.',
        score: 0.9123,
      },
    ]);

    renderWithClient(<AssistantPage />);
    await screen.findByRole('option', { name: 'Manuales' });

    // 1. SSE Answer Mode
    fireEvent.change(screen.getByLabelText('Tu pregunta'), {
      target: { value: '¿Cómo funciona el aislamiento?' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Preguntar' }));

    expect(await screen.findByText('El acceso usa PostgreSQL RLS [1].')).toBeInTheDocument();
    expect(screen.getByText('Política Zero Trust')).toBeInTheDocument();

    // 2. SSE Error handling
    vi.mocked(api.streamAnswer).mockRejectedValueOnce(new Error('Presupuesto agotado'));
    fireEvent.click(screen.getByRole('button', { name: 'Preguntar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Presupuesto agotado');

    // 3. Hybrid Search Mode
    fireEvent.click(screen.getByRole('button', { name: /Solo búsqueda híbrida/i }));
    fireEvent.change(screen.getByLabelText('Términos o consulta semántica'), {
      target: { value: 'aislamiento RLS' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Buscar fragmentos' }));

    expect(await screen.findByText('Fragmento verificado con RLS.')).toBeInTheDocument();
    expect(screen.getByText(/score: 0\.9123/)).toBeInTheDocument();
  });
});
