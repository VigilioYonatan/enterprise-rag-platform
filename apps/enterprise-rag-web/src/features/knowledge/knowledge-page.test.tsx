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
}));

import { KnowledgePage } from '@/knowledge/pages/knowledge-page';

function renderPage() {
  return render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}
    >
      <MemoryRouter>
        <KnowledgePage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const TENANT_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const KB_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

beforeEach(() => {
  mocks.request.mockReset();
  mocks.request.mockImplementation(async (path: string, init?: RequestInit) => {
    if (path === '/tenants' && init?.method === 'POST') {
      return { id: TENANT_ID, name: JSON.parse(String(init.body)).name };
    }
    if (path === '/tenants') {
      return {
        count: 1,
        next: null,
        previous: null,
        results: [{ id: TENANT_ID, name: 'Test Tenant' }],
      };
    }
    if (path.startsWith('/knowledge-bases?')) {
      return {
        count: 1,
        next: null,
        previous: null,
        results: [{ id: KB_ID, tenant_id: TENANT_ID, name: 'Manual Operativo' }],
      };
    }
    if (path === '/knowledge-bases' && init?.method === 'POST') {
      return { id: KB_ID, tenant_id: TENANT_ID, name: JSON.parse(String(init.body)).name };
    }
    if (path === `/knowledge-bases/${KB_ID}` && init?.method === 'PATCH') {
      return { id: KB_ID, tenant_id: TENANT_ID, name: JSON.parse(String(init.body)).name };
    }
    if (path === `/knowledge-bases/${KB_ID}` && init?.method === 'DELETE') {
      return undefined;
    }
    throw new Error(`Unexpected API operation ${path}`);
  });
});

describe('Knowledge forms & KB lifecycle (contract boundary mocked)', () => {
  it('prevents invalid organization submission and exposes accessible error', async () => {
    renderPage();
    const name = await screen.findByLabelText('Nombre de organización');
    fireEvent.change(name, { target: { value: 'x' } });
    fireEvent.click(screen.getByRole('button', { name: 'Crear organización' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Mínimo dos caracteres');
    expect(
      mocks.request.mock.calls.filter(([path, opts]) => path === '/tenants' && opts?.method === 'POST'),
    ).toHaveLength(0);
  });

  it('sends validated organization DTO and clears on confirmed success', async () => {
    renderPage();
    const name = await screen.findByLabelText('Nombre de organización');
    fireEvent.change(name, { target: { value: 'Quality Tenant' } });
    fireEvent.click(screen.getByRole('button', { name: 'Crear organización' }));
    await waitFor(() =>
      expect(
        mocks.request.mock.calls.some(([path, opts]) => path === '/tenants' && opts?.method === 'POST'),
      ).toBe(true),
    );
    const call = mocks.request.mock.calls.find(
      ([path, opts]) => path === '/tenants' && opts?.method === 'POST',
    );
    expect(JSON.parse(String(call?.[1]?.body))).toEqual({ name: 'Quality Tenant' });
    await waitFor(() => expect((name as HTMLInputElement).value).toBe(''));
  });

  it('posts knowledge base with selected tenant and supports accessible ConfirmDialog deletion', async () => {
    renderPage();
    const name = await screen.findByLabelText('Nombre de base');
    fireEvent.change(name, { target: { value: 'Engineering Handbook' } });
    fireEvent.click(screen.getByRole('button', { name: 'Crear base' }));
    await waitFor(() =>
      expect(
        mocks.request.mock.calls.some(
          ([path, opts]) => path === '/knowledge-bases' && opts?.method === 'POST',
        ),
      ).toBe(true),
    );

    const deleteTrigger = await screen.findByRole('button', { name: 'Eliminar Manual Operativo' });
    fireEvent.click(deleteTrigger);
    expect(await screen.findByRole('alertdialog')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar eliminación' }));

    await waitFor(() =>
      expect(
        mocks.request.mock.calls.some(
          ([path, opts]) => path === `/knowledge-bases/${KB_ID}` && opts?.method === 'DELETE',
        ),
      ).toBe(true),
    );
  });

  it('supports inline renaming and cancel of a knowledge base', async () => {
    renderPage();
    const renameBtn = await screen.findByRole('button', { name: 'Renombrar Manual Operativo' });
    fireEvent.click(renameBtn);

    const input = screen.getByLabelText('Nuevo nombre');
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByLabelText('Nuevo nombre')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Renombrar Manual Operativo' }));
    fireEvent.change(screen.getByLabelText('Nuevo nombre'), {
      target: { value: 'Manual Operativo v2' },
    });
    expect(input).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    await waitFor(() =>
      expect(
        mocks.request.mock.calls.some(
          ([path, opts]) => path === `/knowledge-bases/${KB_ID}` && opts?.method === 'PATCH',
        ),
      ).toBe(true),
    );
  });
});
