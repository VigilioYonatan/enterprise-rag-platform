import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  authState: {
    user: null as null | { expired: boolean; profile: { sub: string; email?: string } },
    actorKey: 'anonymous',
    loading: false,
    refresh: vi.fn(),
  },
  logout: vi.fn().mockResolvedValue(undefined),
  api: vi.fn().mockResolvedValue({ sub: 'u1' }),
}));

vi.mock('../auth/auth-context', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useAuth: () => mocks.authState,
  useActorKey: () => mocks.authState.actorKey,
}));

vi.mock('../auth/oidc', () => ({
  logout: () => mocks.logout(),
  login: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../services/api', () => ({
  api: (path: string) => mocks.api(path),
  apiList: vi.fn().mockResolvedValue([]),
  apiPaginated: vi.fn().mockResolvedValue({ count: 2, next: null, previous: null, results: [] }),
}));

import { App } from './app';
import { ErrorBoundary } from './error-boundary';
import { Layout } from './layout';

function CrashChild(): React.ReactElement {
  throw new Error('Fallo controlado de prueba');
}

describe('App Router, Layout & ErrorBoundary', () => {
  beforeEach(() => {
    mocks.logout.mockClear();
    mocks.api.mockClear();
    mocks.authState = {
      user: null,
      actorKey: 'anonymous',
      loading: false,
      refresh: vi.fn(),
    };
  });

  it('catches render exceptions in ErrorBoundary and displays accessible alert', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <ErrorBoundary>
        <CrashChild />
      </ErrorBoundary>,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Fallo controlado de prueba');
    expect(screen.getByRole('button', { name: 'Recargar consola' })).toBeInTheDocument();
    spy.mockRestore();
  });

  it('renders loading state, redirects anonymous users, and shows navigation for authenticated actors', async () => {
    mocks.authState.loading = true;
    const { unmount } = render(
      <MemoryRouter initialEntries={['/app']}>
        <Layout />
      </MemoryRouter>,
    );
    expect(screen.getByRole('status')).toHaveTextContent('Cargando sesión');
    unmount();

    mocks.authState.loading = false;
    mocks.authState.user = null;
    const anon = render(
      <MemoryRouter initialEntries={['/app']}>
        <Routes>
          <Route path="/" element={<div>Pantalla Login</div>} />
          <Route path="/app" element={<Layout />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByText('Pantalla Login')).toBeInTheDocument();
    anon.unmount();

    mocks.authState.user = { expired: false, profile: { sub: 'u1', email: 'owner@enterprise.local' } };
    mocks.authState.actorKey = 'u1';
    render(
      <MemoryRouter initialEntries={['/app']}>
        <Routes>
          <Route path="/app" element={<Layout />}>
            <Route index element={<div>Vista Resumen</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByText('Vista Resumen')).toBeInTheDocument();
    expect(screen.getByText('owner@enterprise.local')).toBeInTheDocument();
    await waitFor(() => expect(mocks.api).toHaveBeenCalledWith('/me'));

    fireEvent.click(screen.getByRole('button', { name: /Cerrar sesión/i }));
    expect(mocks.logout).toHaveBeenCalledOnce();

    fireEvent.click(screen.getByRole('button', { name: 'Abrir menú de navegación' }));
    const mobileNav = await screen.findByRole('navigation', { name: 'Navegación móvil' });
    expect(mobileNav).toBeInTheDocument();

    const logoutButtons = screen.getAllByRole('button', { name: /Cerrar sesión/i });
    fireEvent.click(logoutButtons[logoutButtons.length - 1]);
    expect(mocks.logout).toHaveBeenCalledTimes(2);
  });

  it('renders App root route, authenticated dashboard lazy route, and 404 fallback route while updating document.title', async () => {
    window.history.pushState({}, '', '/ruta-inexistente');
    const view = render(<App />);
    expect(screen.getByText(/404 · Página no encontrada/i)).toBeInTheDocument();
    expect(document.title).toContain('Atlas Knowledge');
    view.unmount();

    mocks.authState.user = { expired: false, profile: { sub: 'u1', email: 'owner@enterprise.local' } };
    mocks.authState.actorKey = 'u1';
    window.history.pushState({}, '', '/app');
    render(<App />);
    expect(await screen.findByText(/Conocimiento confiable, de extremo a extremo/i)).toBeInTheDocument();
    expect(await screen.findByText(/Organizaciones accesibles: 2/i)).toBeInTheDocument();
    expect(document.title).toContain('Resumen · Atlas Knowledge');
  });
});
