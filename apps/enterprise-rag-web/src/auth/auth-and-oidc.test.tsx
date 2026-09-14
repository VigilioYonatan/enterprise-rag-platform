import { render, screen, waitFor } from '@testing-library/react';
import type { User } from 'oidc-client-ts';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider, useActorKey, useAuth } from './auth-context';
import { completeLoginCallback, login, logout, resetCallbackGuardForTests, userManager } from './oidc';
import * as queryClientMod from './query-client';

function AuthProbe() {
  const { actorKey, loading } = useAuth();
  const hookKey = useActorKey();
  return (
    <div>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="actor">{actorKey}</span>
      <span data-testid="hook">{hookKey}</span>
    </div>
  );
}

describe('OIDC PKCE Client & AuthProvider Session Isolation', () => {
  beforeEach(() => {
    resetCallbackGuardForTests();
  });

  it('deduplicates concurrent PKCE signinRedirectCallback calls and handles login/logout', async () => {
    const fakeUser = {
      expired: false,
      access_token: 'tok-1',
      profile: { sub: 'sub-1' },
    } as unknown as User;

    const cbSpy = vi.spyOn(userManager, 'signinRedirectCallback').mockResolvedValue(fakeUser);
    const [a, b] = await Promise.all([completeLoginCallback(), completeLoginCallback()]);
    expect(a).toBe(fakeUser);
    expect(b).toBe(fakeUser);
    expect(cbSpy).toHaveBeenCalledTimes(1);
    cbSpy.mockRestore();

    const redirectSpy = vi.spyOn(userManager, 'signinRedirect').mockResolvedValue(undefined);
    await login();
    expect(redirectSpy).toHaveBeenCalledWith({ extraQueryParams: {} });
    await login('google');
    expect(redirectSpy).toHaveBeenCalledWith({ extraQueryParams: { kc_idp_hint: 'google' } });
    redirectSpy.mockRestore();

    const signoutSpy = vi.spyOn(userManager, 'signoutRedirect').mockResolvedValue(undefined);
    await logout();
    expect(signoutSpy).toHaveBeenCalledOnce();
    signoutSpy.mockRestore();
  });

  it('loads authenticated actor and resets React Query cache on principal switch', async () => {
    expect(() => render(<AuthProbe />)).toThrow('AuthProvider missing');

    const resetSpy = vi.spyOn(queryClientMod, 'resetSessionQueryCache');
    let currentUser: Partial<User> | null = {
      expired: false,
      access_token: 'tok-1',
      profile: { sub: 'user-alpha' } as User['profile'],
    };
    const getUserSpy = vi
      .spyOn(userManager, 'getUser')
      .mockImplementation(async () => currentUser as User | null);

    let capturedRefresh: (() => Promise<void>) | undefined;
    function RefreshCapture() {
      const auth = useAuth();
      capturedRefresh = auth.refresh;
      return <AuthProbe />;
    }

    render(
      <AuthProvider>
        <RefreshCapture />
      </AuthProvider>,
    );

    await waitFor(() => expect(screen.getByTestId('actor')).toHaveTextContent('user-alpha'));
    expect(screen.getByTestId('hook')).toHaveTextContent('user-alpha');

    currentUser = {
      expired: false,
      access_token: 'tok-2',
      profile: { sub: 'user-beta' } as User['profile'],
    };
    await capturedRefresh?.();
    await waitFor(() => expect(screen.getByTestId('actor')).toHaveTextContent('user-beta'));
    expect(resetSpy).toHaveBeenCalled();

    getUserSpy.mockRestore();
    resetSpy.mockRestore();
  });
});
