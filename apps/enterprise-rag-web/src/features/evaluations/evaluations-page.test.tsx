import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ request: vi.fn() }));

vi.mock('~/auth/auth-context', () => ({
  useActorKey: () => 'u-owner',
}));

vi.mock('~/services/api', () => ({
  api: (path: string, init?: RequestInit) => mocks.request(path, init),
  apiList: async (path: string, init?: RequestInit) => {
    const res = await mocks.request(path, init);
    return Array.isArray(res) ? res : res.results;
  },
}));

import { EvaluationsPage } from '@/evaluations/pages/evaluations-page';

const TENANT_ID = '11111111-1111-4111-8111-111111111111';
const KB_ID = '22222222-2222-4222-8222-222222222222';
const DS_ID = '33333333-3333-4333-8333-333333333333';
const DOC_ID = '44444444-4444-4444-8444-444444444444';
const RUN_ID = '55555555-5555-4555-8555-555555555555';

describe('EvaluationsPage LLMOps Suite', () => {
  beforeEach(() => {
    mocks.request.mockReset();
    mocks.request.mockImplementation(async (path: string, init?: RequestInit) => {
      if (path === '/tenants') return [{ id: TENANT_ID, name: 'Org Eval' }];
      if (path.startsWith('/knowledge-bases?')) return [{ id: KB_ID, name: 'KB Eval' }];
      if (path.startsWith('/evaluation/datasets?')) {
        return [{ id: DS_ID, name: 'Golden QA', knowledge_base_id: KB_ID, revision: 2 }];
      }
      if (path === '/evaluation/datasets' && init?.method === 'POST') {
        return { id: DS_ID, name: 'Nuevo Dataset', knowledge_base_id: KB_ID, revision: 1 };
      }
      if (path === `/evaluation/datasets/${DS_ID}` && init?.method === 'DELETE') {
        return { deleted: true };
      }
      if (path.startsWith(`/evaluation/datasets/${DS_ID}/cases?`)) {
        return [
          {
            id: 'case-1',
            question: '¿Dónde reside la llave raíz?',
            expected_document_ids: [DOC_ID],
            expected_abstention: false,
          },
        ];
      }
      if (path === `/evaluation/datasets/${DS_ID}/cases` && init?.method === 'POST') {
        return { id: 'case-2' };
      }
      if (path === `/evaluation/datasets/${DS_ID}/cases/case-1` && init?.method === 'DELETE') {
        return { deleted: true };
      }
      if (path.startsWith('/evaluation/runs?')) {
        return [
          {
            id: RUN_ID,
            dataset_name: 'Golden QA',
            status: 'completed',
            recall_at_6: 1,
            mrr_at_6: 1,
            ndcg_at_6: 1,
            precision_at_6: 0.5,
            abstention_pass_rate: 1,
            case_count: 1,
          },
        ];
      }
      if (path === '/evaluation/runs' && init?.method === 'POST') {
        return { id: RUN_ID, status: 'completed', case_count: 1 };
      }
      if (path === `/evaluation/runs/${RUN_ID}`) {
        return {
          id: RUN_ID,
          status: 'completed',
          case_count: 1,
          results: [
            {
              case_id: 'case-11111111',
              rank_of_first_match: 1,
              recall_at_6: 1,
              ndcg_at_6: 1,
              precision_at_6: 1,
              abstention_pass: null,
              retrieved_document_ids: [DOC_ID],
            },
          ],
        };
      }
      throw new Error(`Unexpected ${path}`);
    });
  });

  it('creates datasets, validates ground-truth UUIDs, runs evaluations, inspects per-case metrics, and deletes cases/datasets', async () => {
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <MemoryRouter>
          <EvaluationsPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(await screen.findByText('¿Dónde reside la llave raíz?')).toBeInTheDocument();

    // Create dataset
    fireEvent.change(screen.getByLabelText('Nombre del dataset'), {
      target: { value: 'Nuevo Dataset' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Crear dataset' }));
    await waitFor(() =>
      expect(
        mocks.request.mock.calls.some(([p, i]) => p === '/evaluation/datasets' && i?.method === 'POST'),
      ).toBe(true),
    );

    // Validate invalid UUID error in case form, then submit valid positive case
    fireEvent.change(screen.getByLabelText('Pregunta'), {
      target: { value: '¿Cuál es el RPO objetivo?' },
    });
    fireEvent.change(screen.getByLabelText(/IDs UUID de documentos relevantes/i), {
      target: { value: 'bad-uuid' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar caso' }));
    expect(await screen.findByText(/UUID inválido/i)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/IDs UUID de documentos relevantes/i), {
      target: { value: DOC_ID },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar caso' }));
    await waitFor(() =>
      expect(
        mocks.request.mock.calls.some(
          ([p, i]) => p === `/evaluation/datasets/${DS_ID}/cases` && i?.method === 'POST',
        ),
      ).toBe(true),
    );

    // Execute evaluation suite & inspect run breakdown
    fireEvent.click(screen.getByRole('button', { name: 'Ejecutar evaluación' }));
    await waitFor(() =>
      expect(
        mocks.request.mock.calls.some(([p, i]) => p === '/evaluation/runs' && i?.method === 'POST'),
      ).toBe(true),
    );
    expect(await screen.findByText(/Primer acierto: 1/i)).toBeInTheDocument();

    // Delete case & dataset
    fireEvent.click(screen.getByRole('button', { name: /Eliminar caso ¿Dónde reside la llave raíz\?/i }));
    await waitFor(() =>
      expect(
        mocks.request.mock.calls.some(
          ([p, i]) => p === `/evaluation/datasets/${DS_ID}/cases/case-1` && i?.method === 'DELETE',
        ),
      ).toBe(true),
    );

    fireEvent.click(screen.getByRole('button', { name: /Eliminar dataset/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar eliminación' }));
    await waitFor(() =>
      expect(
        mocks.request.mock.calls.some(
          ([p, i]) => p === `/evaluation/datasets/${DS_ID}` && i?.method === 'DELETE',
        ),
      ).toBe(true),
    );
  });
});
