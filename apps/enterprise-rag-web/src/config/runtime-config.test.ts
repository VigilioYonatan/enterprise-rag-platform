import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { getRuntimeConfig } from './runtime-config';

describe('Runtime Configuration Resolver', () => {
  const originalAppConfig = window.__APP_CONFIG__;
  const originalRagConfig = window.__RAG_RUNTIME_CONFIG__;

  beforeEach(() => {
    delete window.__APP_CONFIG__;
    delete window.__RAG_RUNTIME_CONFIG__;
  });

  afterEach(() => {
    window.__APP_CONFIG__ = originalAppConfig;
    window.__RAG_RUNTIME_CONFIG__ = originalRagConfig;
  });

  it('provides default fallback configuration when window object has no overrides', () => {
    const config = getRuntimeConfig();
    expect(config.apiBase).toBe('/api/v1');
    expect(config.oidcAuthority).toContain('realms/enterprise');
    expect(config.oidcClientId).toBe('enterprise-rag-web');
    expect(config.googleEnabled).toBe(false);
    expect(config.facebookEnabled).toBe(false);
  });

  it('reads overrides from window.__APP_CONFIG__ with string booleans', () => {
    window.__APP_CONFIG__ = {
      apiBase: 'https://api.corp.internal/api/v1/',
      oidcAuthority: 'https://auth.corp.internal/realms/enterprise',
      oidcClientId: 'corp-portal',
      googleEnabled: 'true',
      facebookEnabled: 'false',
    };

    const config = getRuntimeConfig();
    expect(config.apiBase).toBe('https://api.corp.internal/api/v1');
    expect(config.oidcAuthority).toBe('https://auth.corp.internal/realms/enterprise');
    expect(config.oidcClientId).toBe('corp-portal');
    expect(config.googleEnabled).toBe(true);
    expect(config.facebookEnabled).toBe(false);
  });

  it('reads overrides from window.__RAG_RUNTIME_CONFIG__ with boolean values', () => {
    window.__RAG_RUNTIME_CONFIG__ = {
      apiBase: 'http://localhost:3000',
      googleEnabled: true,
      facebookEnabled: true,
    };

    const config = getRuntimeConfig();
    expect(config.apiBase).toBe('http://localhost:3000');
    expect(config.googleEnabled).toBe(true);
    expect(config.facebookEnabled).toBe(true);
  });
});
