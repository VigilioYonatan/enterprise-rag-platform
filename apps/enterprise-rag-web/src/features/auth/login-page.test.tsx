import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LoginPage } from '@/auth/pages/login-page';
import * as oidc from '~/auth/oidc';

vi.mock('~/auth/oidc', () => ({
  login: vi.fn(),
}));

describe('LoginPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders login welcome text and triggers OIDC institutional login', async () => {
    vi.mocked(oidc.login).mockResolvedValue(undefined);

    render(<LoginPage />);
    expect(screen.getByRole('heading', { level: 1, name: /Iniciar sesión/i })).toBeInTheDocument();
    expect(
      screen.getByText(/Accede con tu cuenta corporativa para consultar las bases de conocimiento/i),
    ).toBeInTheDocument();

    const loginBtn = screen.getByRole('button', { name: /Continuar con Keycloak Corporativo/i });
    expect(loginBtn).toBeInTheDocument();

    fireEvent.click(loginBtn);
    expect(oidc.login).toHaveBeenCalledWith(undefined);
  });

  it('displays error banner when login throws an exception', async () => {
    vi.mocked(oidc.login).mockRejectedValueOnce(new Error('Servidor OIDC no disponible'));

    render(<LoginPage />);
    const loginBtn = screen.getByRole('button', { name: /Continuar con Keycloak Corporativo/i });
    fireEvent.click(loginBtn);

    const errorBanner = await screen.findByRole('alert');
    expect(errorBanner).toHaveTextContent('Servidor OIDC no disponible');
  });
});
