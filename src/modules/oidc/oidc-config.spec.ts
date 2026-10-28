import { loadOidcConfig } from './oidc-config';

const key = 'a'.repeat(64);
const jwks = JSON.stringify({
  keys: [{ kty: 'RSA', n: 'n', e: 'AQAB', d: 'private', kid: 'k1' }],
});

const valid = {
  OIDC_ISSUER: 'https://api.example.com/api/oidc/',
  OIDC_JWKS: jwks,
  OIDC_COOKIE_KEYS: `${key}, ${key}`,
  FRONTEND_URL: 'https://example.com/, https://beta.example.com',
};

describe('loadOidcConfig', () => {
  it('leaves the provider off without an issuer', () => {
    expect(loadOidcConfig({})).toBeNull();
    expect(loadOidcConfig({ OIDC_ISSUER: '  ' })).toBeNull();
  });

  it('derives the API base and the first frontend origin', () => {
    expect(loadOidcConfig(valid)).toEqual({
      issuer: 'https://api.example.com/api/oidc',
      apiBaseUrl: 'https://api.example.com/api',
      frontendUrl: 'https://example.com',
      jwks: JSON.parse(jwks) as unknown,
      cookieKeys: [key, key],
      allowPrivateNetworkFetch: false,
    });
  });

  it('only allows private network fetches when asked to', () => {
    expect(
      loadOidcConfig({ ...valid, OIDC_ALLOW_PRIVATE_NETWORK_FETCH: 'true' })
        ?.allowPrivateNetworkFetch,
    ).toBe(true);
  });

  it.each([
    [{ OIDC_ISSUER: 'api.example.com/oidc' }, /absolute URL/],
    [{ OIDC_ISSUER: 'https://api.example.com/api' }, /\/api\/oidc/],
    [{ OIDC_ISSUER: 'https://api.example.com/oidc?x=1' }, /query/],
    [{ OIDC_JWKS: 'not json' }, /JSON Web Key Set/],
    [
      { OIDC_JWKS: JSON.stringify({ keys: [{ kty: 'RSA', n: 'n', e: 'AQAB' }] }) },
      /private signing key/,
    ],
    [{ OIDC_COOKIE_KEYS: 'short' }, /OIDC_COOKIE_KEYS/],
    [{ FRONTEND_URL: '' }, /FRONTEND_URL/],
  ])('refuses an incomplete configuration %#', (override, message) => {
    expect(() => loadOidcConfig({ ...valid, ...override })).toThrow(message);
  });
});
