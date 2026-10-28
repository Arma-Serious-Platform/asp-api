import type { OidcClient } from '@prisma/client';
import type { ClientMetadata } from 'oidc-provider';
import { decryptOidcClientSecret } from './oidc-secret-crypto';

const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

/**
 * Returns why a client URL (redirect, post-logout redirect, back-channel
 * logout) cannot be registered, or null when it can. Only https is allowed,
 * plus http on loopback hosts for local development. Matching is exact, so
 * wildcards and fragments are rejected.
 */
export function getClientUrlProblem(value: string): string | null {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return `${value} is not an absolute URL`;
  }

  const isLoopback = LOOPBACK_HOSTS.has(url.hostname);

  if (
    url.protocol !== 'https:' &&
    !(url.protocol === 'http:' && isLoopback)
  ) {
    return `${value} must use https (http is allowed for localhost only)`;
  }

  if (url.hash || value.includes('#')) {
    return `${value} must not contain a fragment`;
  }

  if (value.includes('*')) {
    return `${value} must not contain wildcards`;
  }

  if (url.username || url.password) {
    return `${value} must not contain credentials`;
  }

  return null;
}

export function getUrlHost(value: unknown) {
  if (typeof value !== 'string') {
    return null;
  }

  try {
    return new URL(value).host;
  } catch {
    return null;
  }
}

/** The host users see for a client, taken from its first redirect URI. */
export function getClientDomain(client: Pick<OidcClient, 'redirectUris'>) {
  return getUrlHost(client.redirectUris[0]);
}

/**
 * Metadata the provider uses for a registered client, or undefined for a
 * disabled one so that every request from it fails.
 */
export function toClientMetadata(
  client: OidcClient,
  decryptSecret: (payload: string) => string = decryptOidcClientSecret,
): ClientMetadata | undefined {
  if (client.disabled) {
    return undefined;
  }

  return {
    client_id: client.clientId,
    client_name: client.name,
    ...(client.clientSecretEncrypted
      ? {
          client_secret: decryptSecret(client.clientSecretEncrypted),
          token_endpoint_auth_method: 'client_secret_basic',
        }
      : { token_endpoint_auth_method: 'none' }),
    redirect_uris: client.redirectUris,
    post_logout_redirect_uris: client.postLogoutRedirectUris,
    ...(client.backchannelLogoutUri
      ? {
          backchannel_logout_uri: client.backchannelLogoutUri,
          // Logout tokens carry `sub` only: the client ends all of the
          // user's sessions, which is what revocation on our side means.
          backchannel_logout_session_required: false,
        }
      : {}),
    grant_types: ['authorization_code', 'refresh_token'],
    response_types: ['code'],
    // No `scope` here: the provider would refuse the whole request when a
    // library asks for its default scopes (often `openid profile email`) and
    // one of them is not allowed. Allowed scopes are applied when the grant
    // is made instead; the rest is left out of the tokens.
    first_party: client.firstParty,
  };
}
