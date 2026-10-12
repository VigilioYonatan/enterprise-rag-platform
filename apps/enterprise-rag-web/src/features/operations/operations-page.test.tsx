import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock('~/services/api', () => ({
  api: (path: string, options?: RequestInit) => mocks.request(path, options),
  apiList: async (path: string, options?: RequestInit) => {
    const res = await mocks.request(path, options);
    return Array.isArray(res) ? res : res.results;
  },
  apiPaginated: async (path: string, options?: RequestInit) => {
    const res = await mocks.request(path, options);
    return Array.isArray(res) ? { count: res.length, next: null, previous: null, results: res } : res;
  },
}));

import { OperationsPage } from '@/operations/pages/operations-page';

const TENANT_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const DLQ_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

function renderOperations() {
  return render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}
    >
      <MemoryRouter>
        <OperationsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  mocks.request.mockReset();
  mocks.request.mockImplementation(async (path: string, init?: RequestInit) => {
    if (path === '/tenants') {
      return { count: 1, next: null, previous: null, results: [{ id: TENANT_ID, name: 'Org FinOps' }] };
    }
    if (path.startsWith('/usage/summary')) return [];
    if (path.startsWith('/usage/budget?')) {
      return { daily_answer_limit: 50, daily_cost_limit_usd: 25 };
    }
    if (path === `/usage/budget/${TENANT_ID}` && init?.method === 'PUT') {
      return JSON.parse(String(init.body));
    }
    if (path.startsWith('/operations/dlq?')) {
      return {
        count: 1,
        next: null,
        previous: null,
        results: [
          {
            id: DLQ_ID,
            source: 'ingestion_job',
            target_id: 'doc-1',
            title: 'Contrato Fallido.pdf',
            attempts: 3,
            error_message: 'ClamAV timeout',
            updated_at: new Date().toISOString(),
          },
        ],
      };
    }
    if (path === `/operations/dlq/${DLQ_ID}/replay` && init?.method === 'POST') {
      return { id: DLQ_ID, source: 'ingestion_job', status: 'queued' };
    }
    if (path.startsWith('/audit/events?')) {
      return {
        count: 1,
        next: null,
        previous: null,
        results: [
          {
            id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
            actor_sub: 'actor-owner-sub-0001',
            action: 'budget.updated',
            target_type: 'tenant',
            target_id: TENANT_ID,
            created_at: '2026-06-01T12:00:00.000Z',
          },
        ],
      };
    }
    throw new Error(`Unexpected API operation ${path}`);
  });
});

describe('OperationsPage FinOps guardrails & DLQ replay', () => {
  it('blocks empty USD budget submission instead of coercing empty input to zero', async () => {
    renderOperations();
    const costInput = await screen.findByLabelText(/Presupuesto diario USD/);
    await waitFor(() => expect((costInput as HTMLInputElement).value).toBe('25'));

    fireEvent.change(costInput, { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Actualizar presupuesto' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('El presupuesto diario USD es obligatorio');
    expect(
      mocks.request.mock.calls.filter(
        ([p, opts]) => p === `/usage/budget/${TENANT_ID}` && opts?.method === 'PUT',
      ),
    ).toHaveLength(0);
  });

  it('lists DLQ failures and replays ingestion job on operator click', async () => {
    renderOperations();
    expect(await screen.findByText(/Contrato Fallido\.pdf/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Reencolar/ }));

    await waitFor(() =>
      expect(
        mocks.request.mock.calls.some(
          ([p, opts]) => p === `/operations/dlq/${DLQ_ID}/replay` && opts?.method === 'POST',
        ),
      ).toBe(true),
    );

    const limitInput = await screen.findByLabelText(/Máximo de consultas de IA por día/i);
    await waitFor(() => expect((limitInput as HTMLInputElement).value).toBe('50'));
    fireEvent.change(limitInput, { target: { value: '120' } });
    fireEvent.click(screen.getByRole('button', { name: 'Actualizar presupuesto' }));

    await waitFor(() =>
      expect(
        mocks.request.mock.calls.some(
          ([p, opts]) => p === `/usage/budget/${TENANT_ID}` && opts?.method === 'PUT',
        ),
      ).toBe(true),
    );

    const viewAuditBtn = await screen.findByRole('button', { name: 'Ver evento budget.updated' });
    fireEvent.click(viewAuditBtn);
    expect(await screen.findByText('actor-owner-sub-0001')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }));
    await waitFor(() => expect(screen.queryByText('actor-owner-sub-0001')).not.toBeInTheDocument());
  });
});
