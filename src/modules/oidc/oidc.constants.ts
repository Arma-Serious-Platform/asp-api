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
 *
 * Standard OpenID Connect claims first, then the names popular apps look
 * for by default, so they work without mapping:
 * - `displayName`: Wiki.js and other Passport-based apps;
 * - `username`: Grafana (otherwise it uses the email as the login);
 * - `roles` / `groups`: the role names, the usual claims for role and group
 *   sync (Nextcloud, Wiki.js, Grafana, Gitea…).
 *
 * `roles` and `groups` are listed under `profile` too, because many apps
 * never ask for a separate scope: first-party apps get them with `profile`,
 * third-party apps only with `roles` (see includeRolesClaims).
 */
export const OIDC_SCOPE_CLAIMS = {
  openid: ['sub'],
  profile: [
    'name',
    'nickname',
    'preferred_username',
    'displayName',
    'username',
    'picture',
    'profile',
    'locale',
    'zoneinfo',
    'updated_at',
    'roles',
    'groups',
  ],
  email: ['email', 'email_verified'],
  roles: ['roles', 'groups'],
  squad: ['squad', 'squad_role', 'side'],
  game: ['steam_id', 'game_access', 'banned_until', 'muted'],
};

/** What the community uses; sent as `locale` and `zoneinfo`. */
export const OIDC_LOCALE = 'uk';
export const OIDC_ZONEINFO = 'Europe/Kyiv';

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
