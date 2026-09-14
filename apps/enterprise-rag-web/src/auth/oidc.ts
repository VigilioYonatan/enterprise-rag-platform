import { type User, UserManager, WebStorageStateStore } from 'oidc-client-ts';
import { getRuntimeConfig } from '../config/runtime-config';
import { resetSessionQueryCache } from './query-client';

const runtime = getRuntimeConfig();

export const userManager = new UserManager({
  authority: runtime.oidcAuthority,
  client_id: runtime.oidcClientId,
  redirect_uri: `${window.location.origin}/auth/callback`,
  post_logout_redirect_uri: `${window.location.origin}/`,
  response_type: 'code',
  scope: 'openid profile email',
  userStore: new WebStorageStateStore({ store: window.sessionStorage }),
  automaticSilentRenew: false,
});

let inflightCallback: Promise<User> | null = null;

/**
 * Deduplicates OIDC PKCE code exchange across React 19 StrictMode double-mounts
 * so the one-time authorization state is never consumed twice in the same tab.
 */
export function completeLoginCallback(): Promise<User> {
  if (!inflightCallback) {
    inflightCallback = userManager.signinRedirectCallback().finally(() => {
      inflightCallback = null;
    });
  }
  return inflightCallback;
}

export function resetCallbackGuardForTests(): void {
  inflightCallback = null;
}

export async function login(provider?: 'google' | 'facebook'): Promise<void> {
  await userManager.signinRedirect({
    extraQueryParams: provider ? { kc_idp_hint: provider } : {},
  });
}

export async function logout(): Promise<void> {
  resetSessionQueryCache();
  try {
    await userManager.signoutRedirect();
  } catch {
    await userManager.removeUser().catch(() => {});
    window.location.assign('/');
  }
}
