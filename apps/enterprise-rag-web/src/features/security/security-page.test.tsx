import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  request: vi.fn(),
  login: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('~/auth/auth-context', () => ({
  useAuth: () => ({
    user: { expired: false, profile: { sub: 'u-owner', email: 'owner@enterprise.local' } },
    actorKey: 'u-owner',
    loading: false,
    refresh: vi.fn(),
  }),
}));

vi.mock('~/auth/oidc', () => ({
  login: () => mocks.login(),
}));

vi.mock('~/services/api', () => ({
  api: (path: string, init?: RequestInit) => mocks.request(path, init),
  apiList: async (path: string, init?: RequestInit) => {
    const res = await mocks.request(path, init);
    return Array.isArray(res) ? res : res.results;
  },
}));

import { SecurityPage } from '@/security/pages/security-page';

const TENANT_ID = '11111111-1111-4111-8111-111111111111';
const GROUP_ID = '22222222-2222-4222-8222-222222222222';

describe('SecurityPage Tenant Members, Roles & Access Groups', () => {
  beforeEach(() => {
    mocks.request.mockReset();
    mocks.login.mockClear();
    mocks.request.mockImplementation(async (path: string, init?: RequestInit) => {
      if (path === '/tenants') return [{ id: TENANT_ID, name: 'Org Zero Trust' }];
      if (path.startsWith(`/tenants/${TENANT_ID}/members?`)) {
        return [
          { user_sub: 'u-owner', email: 'owner@enterprise.local', role: 'owner' },
          { user_sub: 'u-peer', email: 'peer@enterprise.local', role: 'viewer' },
        ];
      }
      if (path === `/tenants/${TENANT_ID}/members` && init?.method === 'POST') {
        return { user_sub: 'u-new', role: 'viewer' };
      }
      if (path === `/tenants/${TENANT_ID}/members/u-peer` && init?.method === 'PATCH') {
        return { user_sub: 'u-peer', role: 'admin' };
      }
      if (path === `/tenants/${TENANT_ID}/members/u-peer` && init?.method === 'DELETE') {
        return { removed: true };
      }
      if (path.startsWith(`/tenants/${TENANT_ID}/groups?`)) {
        return [{ id: GROUP_ID, name: 'Comité Riesgo', member_count: 1 }];
      }
      if (path.startsWith(`/groups/${GROUP_ID}/members?`)) {
        return [{ user_sub: 'u-peer', email: 'peer@enterprise.local' }];
      }
      if (path === '/groups' && init?.method === 'POST') {
        return { id: GROUP_ID };
      }
      if (path === `/groups/${GROUP_ID}` && init?.method === 'DELETE') {
        return { removed: true };
      }
      if (path === `/groups/${GROUP_ID}/members` && init?.method === 'POST') {
        return { user_sub: 'u-owner' };
      }
      if (path === `/groups/${GROUP_ID}/members/u-peer` && init?.method === 'DELETE') {
        return { removed: true };
      }
      throw new Error(`Unexpected ${path}`);
    });
  });

  it('adds members, updates roles, removes members, creates/deletes groups, and manages group membership', async () => {
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <MemoryRouter>
          <SecurityPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect((await screen.findAllByText('peer@enterprise.local')).length).toBeGreaterThan(0);

    // Add member by email
    fireEvent.change(screen.getByLabelText('Correo del usuario'), {
      target: { value: 'nuevo@enterprise.local' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Agregar miembro' }));
    await waitFor(() =>
      expect(
        mocks.request.mock.calls.some(
          ([p, i]) => p === `/tenants/${TENANT_ID}/members` && i?.method === 'POST',
        ),
      ).toBe(true),
    );

    // Change peer role
    fireEvent.change(screen.getByLabelText('Rol de peer@enterprise.local'), {
      target: { value: 'admin' },
    });
    await waitFor(() =>
      expect(
        mocks.request.mock.calls.some(
          ([p, i]) => p === `/tenants/${TENANT_ID}/members/u-peer` && i?.method === 'PATCH',
        ),
      ).toBe(true),
    );

    // Create group
    fireEvent.change(screen.getByLabelText('Nombre'), {
      target: { value: 'Equipo Legal' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Crear grupo' }));
    await waitFor(() =>
      expect(mocks.request.mock.calls.some(([p, i]) => p === '/groups' && i?.method === 'POST')).toBe(true),
    );

    // Assign member to group & remove from group
    fireEvent.change(screen.getByLabelText('Miembro'), { target: { value: 'u-owner' } });
    fireEvent.click(screen.getByRole('button', { name: 'Añadir al grupo' }));
    await waitFor(() =>
      expect(
        mocks.request.mock.calls.some(
          ([p, i]) => p === `/groups/${GROUP_ID}/members` && i?.method === 'POST',
        ),
      ).toBe(true),
    );

    fireEvent.click(screen.getByRole('button', { name: 'Quitar del grupo a peer@enterprise.local' }));
    await waitFor(() =>
      expect(
        mocks.request.mock.calls.some(
          ([p, i]) => p === `/groups/${GROUP_ID}/members/u-peer` && i?.method === 'DELETE',
        ),
      ).toBe(true),
    );

    // Remove member via ConfirmDialog
    fireEvent.click(screen.getByRole('button', { name: 'Remover miembro peer@enterprise.local' }));
    fireEvent.click(screen.getByRole('button', { name: 'Remover miembro' }));
    await waitFor(() =>
      expect(
        mocks.request.mock.calls.some(
          ([p, i]) => p === `/tenants/${TENANT_ID}/members/u-peer` && i?.method === 'DELETE',
        ),
      ).toBe(true),
    );

    // Delete group via ConfirmDialog
    fireEvent.click(screen.getByRole('button', { name: 'Eliminar grupo Comité Riesgo' }));
    fireEvent.click(screen.getByRole('button', { name: 'Eliminar grupo' }));
    await waitFor(() =>
      expect(
        mocks.request.mock.calls.some(([p, i]) => p === `/groups/${GROUP_ID}` && i?.method === 'DELETE'),
      ).toBe(true),
    );
  });
});
