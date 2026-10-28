export type OidcSigningKey = JsonWebKey & { kid?: string; alg?: string };

export type OidcConfig = {
  issuer: string;
  /** Public URL of the API's global prefix (the issuer without `/oidc`). */
  apiBaseUrl: string;
  /** Where the login, consent and connected-apps pages live. */
  frontendUrl: string;
  jwks: { keys: OidcSigningKey[] };
  cookieKeys: string[];
  /**
   * Lets back-channel logout reach loopback and private addresses, which the
   * provider blocks against SSRF. For local development and tests only.
   */
  allowPrivateNetworkFetch: boolean;
};

const MIN_COOKIE_KEY_LENGTH = 32;

/**
 * Reads the provider settings. Returns null when OIDC_ISSUER is unset, which
 * leaves the provider off; once it is set, every other setting is required.
 */
export function loadOidcConfig(
  env: NodeJS.ProcessEnv = process.env,
): OidcConfig | null {
  const issuer = env.OIDC_ISSUER?.trim().replace(/\/+$/, '');

  if (!issuer) {
    return null;
  }

  let issuerUrl: URL;
  try {
    issuerUrl = new URL(issuer);
  } catch {
    throw new Error('OIDC_ISSUER must be an absolute URL');
  }

  if (!issuerUrl.pathname.endsWith('/oidc')) {
    throw new Error(
      'OIDC_ISSUER must be the public URL of /api/oidc, e.g. https://api.example.com/api/oidc',
    );
  }

  if (issuerUrl.search || issuerUrl.hash) {
    throw new Error('OIDC_ISSUER must not have a query or fragment');
  }

  let jwks: { keys?: OidcSigningKey[] };
  try {
    jwks = JSON.parse(env.OIDC_JWKS ?? '') as typeof jwks;
  } catch {
    throw new Error(
      'OIDC_JWKS must be a JSON Web Key Set (generate one with scripts/oidc-generate-keys.js)',
    );
  }

  if (
    !Array.isArray(jwks.keys) ||
    !jwks.keys.length ||
    jwks.keys.some((key) => !key.d)
  ) {
    throw new Error('OIDC_JWKS must hold at least one private signing key');
  }

  const cookieKeys = (env.OIDC_COOKIE_KEYS ?? '')
    .split(',')
    .map((key) => key.trim())
    .filter(Boolean);

  if (
    !cookieKeys.length ||
    cookieKeys.some((key) => key.length < MIN_COOKIE_KEY_LENGTH)
  ) {
    throw new Error(
      `OIDC_COOKIE_KEYS must be a comma-separated list of keys of at least ${MIN_COOKIE_KEY_LENGTH} characters`,
    );
  }

  const frontendUrl = (env.FRONTEND_URL ?? '')
    .split(',')
    .map((origin) => origin.trim().replace(/\/+$/, ''))
    .find(Boolean);

  if (!frontendUrl) {
    throw new Error('FRONTEND_URL is required when OIDC_ISSUER is set');
  }

  return {
    issuer,
    apiBaseUrl: issuer.slice(0, -'/oidc'.length),
    frontendUrl,
    jwks: { keys: jwks.keys },
    cookieKeys,
    allowPrivateNetworkFetch: env.OIDC_ALLOW_PRIVATE_NETWORK_FETCH === 'true',
  };
}
