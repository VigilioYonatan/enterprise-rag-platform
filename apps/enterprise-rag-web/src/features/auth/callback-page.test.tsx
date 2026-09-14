import { render, screen, waitFor } from '@testing-library/react';
import { StrictMode } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const oidcSpies = vi.hoisted(() => ({
  signinRedirectCallback: vi.fn(),
  getUser: vi.fn(),
}));

vi.mock('oidc-client-ts', () => {
  class MockWebStorageStateStore {}
  class MockUserManager {
    signinRedirectCallback = oidcSpies.signinRedirectCallback;
    getUser = oidcSpies.getUser;
    events = {
      addUserLoaded: vi.fn(),
      removeUserLoaded: vi.fn(),
      addUserUnloaded: vi.fn(),
      removeUserUnloaded: vi.fn(),
      addAccessTokenExpired: vi.fn(),
      removeAccessTokenExpired: vi.fn(),
    };
  }
  return {
    UserManager: MockUserManager,
    WebStorageStateStore: MockWebStorageStateStore,
  };
});

import { CallbackPage } from '@/auth/pages/callback-page';
import { resetCallbackGuardForTests } from '~/auth/oidc';

describe('CallbackPage OIDC PKCE StrictMode safety', () => {
  beforeEach(() => {
    resetCallbackGuardForTests();
    oidcSpies.signinRedirectCallback.mockReset();
    oidcSpies.getUser.mockReset();
  });

  it('deduplicates signinRedirectCallback across React 19 StrictMode double mount', async () => {
    oidcSpies.signinRedirectCallback.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve({ expired: false }), 25)),
    );

    render(
      <StrictMode>
        <MemoryRouter initialEntries={['/auth/callback']}>
          <Routes>
            <Route path="/auth/callback" element={<CallbackPage />} />
            <Route path="/app" element={<div>Consola autenticada</div>} />
          </Routes>
        </MemoryRouter>
      </StrictMode>,
    );

    await waitFor(() => expect(screen.getByText('Consola autenticada')).toBeInTheDocument());
    expect(oidcSpies.signinRedirectCallback).toHaveBeenCalledTimes(1);
  });

  it('renders recovery link without nesting alert inside status on failure', async () => {
    oidcSpies.signinRedirectCallback.mockRejectedValue(new Error('Invalid PKCE state'));
    oidcSpies.getUser.mockResolvedValue(null);

    render(
      <MemoryRouter initialEntries={['/auth/callback']}>
        <Routes>
          <Route path="/auth/callback" element={<CallbackPage />} />
        </Routes>
      </MemoryRouter>,
    );

    const alertBox = await screen.findByRole('alert');
    expect(alertBox).toHaveTextContent('Invalid PKCE state');
    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.getByRole('link', { name: 'Volver al inicio de sesión' })).toHaveAttribute('href', '/');
  });
});
