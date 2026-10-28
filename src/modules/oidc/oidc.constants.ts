import { SESSION_MAX_AGE_DAYS } from 'src/modules/auth/auth.constants';

/** Scopes a client can be allowed besides `openid`, which every client gets. */
export const OIDC_CLIENT_SCOPES = [
  'profile',
  'email',
  'roles',
  'squad',
  'game',
  'offline_access',
] as const;

export type OidcClientScope = (typeof OIDC_CLIENT_SCOPES)[number];

/**
 * Claims each scope releases. The userinfo endpoint reads them from the
 * database on every call, so they are always current; the ID token carries
 * the same claims as of the login.
 */
export const OIDC_SCOPE_CLAIMS = {
  openid: ['sub'],
  // `name` is what most libraries display; it is the nickname here.
  profile: ['name', 'nickname', 'preferred_username', 'picture', 'updated_at'],
  email: ['email', 'email_verified'],
  roles: ['asp_roles'],
  squad: ['squad', 'squad_role', 'side'],
  game: ['steam_id', 'game_access', 'banned_until', 'muted'],
};

/**
 * Where the provider is mounted, under the API's global prefix. OIDC_ISSUER
 * is the public URL of this path.
 */
export const OIDC_MOUNT_PATH = '/api/oidc';

const DAY = 24 * 60 * 60;

/** Lifetimes in seconds. */
export const OIDC_TTL = {
  AuthorizationCode: 60,
  AccessToken: 10 * 60,
  IdToken: 10 * 60,
  Interaction: 10 * 60,
  RefreshToken: 30 * DAY,
  Grant: 30 * DAY,
  Session: SESSION_MAX_AGE_DAYS * DAY,
};
