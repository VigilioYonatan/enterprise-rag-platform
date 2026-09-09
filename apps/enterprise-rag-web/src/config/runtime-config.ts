export interface RuntimeAppConfig {
  apiBase?: string;
  oidcAuthority?: string;
  oidcClientId?: string;
  googleEnabled?: boolean | string;
  facebookEnabled?: boolean | string;
}

declare global {
  interface Window {
    __APP_CONFIG__?: RuntimeAppConfig;
    __RAG_RUNTIME_CONFIG__?: RuntimeAppConfig;
  }
}

function parseBool(value: boolean | string | undefined): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return value.trim().toLowerCase() === 'true';
  return false;
}

export function getRuntimeConfig() {
  const winConfig =
    typeof window !== 'undefined' ? (window.__APP_CONFIG__ ?? window.__RAG_RUNTIME_CONFIG__ ?? {}) : {};

  return {
    apiBase: (winConfig.apiBase || import.meta.env.VITE_API_BASE || '/api/v1').replace(/\/+$/, ''),
    oidcAuthority:
      winConfig.oidcAuthority ||
      import.meta.env.VITE_OIDC_AUTHORITY ||
      'http://localhost:8081/realms/enterprise',
    oidcClientId: winConfig.oidcClientId || import.meta.env.VITE_OIDC_CLIENT_ID || 'enterprise-rag-web',
    googleEnabled: parseBool(winConfig.googleEnabled ?? import.meta.env.VITE_GOOGLE_ENABLED),
    facebookEnabled: parseBool(winConfig.facebookEnabled ?? import.meta.env.VITE_FACEBOOK_ENABLED),
  };
}
