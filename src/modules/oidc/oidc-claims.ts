import type { Prisma } from '@prisma/client';
import type { AccountState } from 'src/modules/users/user-restrictions.service';
import { OIDC_LOCALE, OIDC_ZONEINFO } from './oidc.constants';

export const OIDC_ACCOUNT_SELECT = {
  id: true,
  nickname: true,
  email: true,
  isEmailVerified: true,
  avatarUrl: true,
  avatar: { select: { url: true } },
  steamId: true,
  roles: true,
  status: true,
  bannedUntil: true,
  isMuted: true,
  squadRole: true,
  squad: {
    select: {
      id: true,
      name: true,
      tag: true,
      side: { select: { id: true, name: true, type: true } },
    },
  },
  updatedAt: true,
} satisfies Prisma.UserSelect;

export type OidcAccount = Prisma.UserGetPayload<{
  select: typeof OIDC_ACCOUNT_SELECT;
}>;

/**
 * Roles are released with the `roles` scope, and to first-party apps with
 * `profile` as well: many apps (Wiki.js, Nextcloud) only ever ask for
 * `openid profile email`. A third-party app must ask for `roles`, which its
 * consent screen shows.
 */
export function includeRolesClaims(scope: string, firstParty: boolean) {
  const scopes = scope.split(' ');
  return scopes.includes('roles') || (firstParty && scopes.includes('profile'));
}

/**
 * Every claim the account can release. The provider keeps only those of the
 * scopes the client was granted (see OIDC_SCOPE_CLAIMS); roles are left out
 * unless `includeRoles`.
 */
export function buildAccountClaims(
  account: OidcAccount,
  state: AccountState,
  muted: boolean,
  options: { frontendUrl: string; includeRoles: boolean },
) {
  const { squad } = account;

  return {
    sub: account.id,
    name: account.nickname,
    nickname: account.nickname,
    preferred_username: account.nickname,
    displayName: account.nickname,
    username: account.nickname,
    picture: account.avatar?.url ?? account.avatarUrl ?? null,
    profile: `${options.frontendUrl}/profile/${account.id}`,
    locale: OIDC_LOCALE,
    zoneinfo: OIDC_ZONEINFO,
    updated_at: Math.floor(account.updatedAt.getTime() / 1000),
    email: account.email,
    email_verified: account.isEmailVerified,
    ...(options.includeRoles && {
      roles: account.roles,
      groups: account.roles,
    }),
    squad: squad ? { id: squad.id, name: squad.name, tag: squad.tag } : null,
    squad_role: squad ? account.squadRole : null,
    side: squad?.side ?? null,
    steam_id: account.steamId,
    game_access: state === 'active',
    banned_until:
      state === 'temporarily_banned' && account.bannedUntil
        ? account.bannedUntil.toISOString()
        : null,
    muted,
  };
}
