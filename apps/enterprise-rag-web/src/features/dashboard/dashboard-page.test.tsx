import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DashboardPage } from '@/dashboard/pages/dashboard-page';
import * as api from '~/services/api';

vi.mock('~/auth/auth-context', () => ({
  useActorKey: () => 'actor-test-sub',
}));

vi.mock('~/services/api', () => ({
  apiPaginated: vi.fn(),
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

describe('DashboardPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders dashboard hero and navigation feature cards', async () => {
    vi.mocked(api.apiPaginated).mockResolvedValue({
      count: 2,
      next: null,
      previous: null,
      results: [
        { id: 't1', name: 'Tenant Alpha' },
        { id: 't2', name: 'Tenant Beta' },
      ],
    });

    renderWithClient(<DashboardPage />);

    expect(
      screen.getByRole('heading', { level: 1, name: 'Conocimiento confiable, de extremo a extremo.' }),
    ).toBeInTheDocument();

    expect(screen.getByText('Bibliotecas privadas')).toBeInTheDocument();
    expect(screen.getByText('Respuestas trazables')).toBeInTheDocument();
    expect(screen.getByText('Control de acceso')).toBeInTheDocument();

    const tenantBadge = await screen.findByText(/Organizaciones accesibles:\s*2/i);
    expect(tenantBadge).toBeInTheDocument();
  });
});
