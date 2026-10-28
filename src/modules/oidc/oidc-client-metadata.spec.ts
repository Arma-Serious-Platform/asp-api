import type { OidcClient } from '@prisma/client';
import {
  getClientDomain,
  getClientUrlProblem,
  toClientMetadata,
} from './oidc-client-metadata';

const client: OidcClient = {
  id: 'id-1',
  clientId: 'vtg_abc',
  name: 'Squad Stats',
  clientSecretEncrypted: 'encrypted',
  redirectUris: ['https://stats.example.org/callback'],
  postLogoutRedirectUris: ['https://stats.example.org/'],
  backchannelLogoutUri: 'https://stats.example.org/backchannel',
  allowedScopes: ['profile', 'roles'],
  firstParty: false,
  disabled: false,
  createdById: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('getClientUrlProblem', () => {
  it.each([
    'https://stats.example.org/callback',
    'https://stats.example.org:8443/auth/callback?x=1',
    'http://localhost:5050/callback',
    'http://127.0.0.1:5050/callback',
    'http://[::1]:5050/callback',
  ])('accepts %s', (url) => {
    expect(getClientUrlProblem(url)).toBeNull();
  });

  it.each([
    ['stats.example.org/callback', /absolute URL/],
    ['http://stats.example.org/callback', /https/],
    ['http://localhost.evil.com/callback', /https/],
    ['javascript:alert(1)', /https/],
    ['https://stats.example.org/callback#done', /fragment/],
    ['https://stats.example.org/callback#', /fragment/],
    ['https://*.example.org/callback', /wildcards/],
    ['https://user:pass@stats.example.org/callback', /credentials/],
  ])('rejects %s', (url, problem) => {
    expect(getClientUrlProblem(url)).toMatch(problem);
  });
});

describe('getClientDomain', () => {
  it('shows the host of the first redirect URI', () => {
    expect(getClientDomain(client)).toBe('stats.example.org');
    expect(getClientDomain({ redirectUris: [] })).toBeNull();
  });
});

describe('toClientMetadata', () => {
  it('maps a confidential client', () => {
    expect(toClientMetadata(client, (payload) => `plain:${payload}`)).toEqual({
      client_id: 'vtg_abc',
      client_name: 'Squad Stats',
      client_secret: 'plain:encrypted',
      token_endpoint_auth_method: 'client_secret_basic',
      redirect_uris: ['https://stats.example.org/callback'],
      post_logout_redirect_uris: ['https://stats.example.org/'],
      backchannel_logout_uri: 'https://stats.example.org/backchannel',
      backchannel_logout_session_required: false,
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code'],
      first_party: false,
    });
  });

  it('maps a public client to PKCE only', () => {
    const metadata = toClientMetadata({
      ...client,
      clientSecretEncrypted: null,
      backchannelLogoutUri: null,
    });

    expect(metadata).toMatchObject({ token_endpoint_auth_method: 'none' });
    expect(metadata).not.toHaveProperty('client_secret');
    expect(metadata).not.toHaveProperty('backchannel_logout_uri');
  });

  it('hides a disabled client from the provider', () => {
    expect(toClientMetadata({ ...client, disabled: true })).toBeUndefined();
  });
});
