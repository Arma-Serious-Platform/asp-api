import { SideType, SquadRole, UserRole, UserStatus } from '@prisma/client';
import {
  OidcAccount,
  buildAccountClaims,
  includeRolesClaims,
} from './oidc-claims';

const account: OidcAccount = {
  id: 'user-1',
  nickname: 'Sokil',
  email: 'sokil@example.com',
  isEmailVerified: true,
  avatarUrl: 'https://legacy.example/avatar.png',
  avatar: null,
  steamId: '76561197960287930',
  roles: [UserRole.USER, UserRole.GAME_ADMIN],
  status: UserStatus.ACTIVE,
  bannedUntil: null,
  isMuted: false,
  squadRole: SquadRole.HQ,
  squad: {
    id: 'squad-1',
    name: 'Bravo',
    tag: 'BRV',
    side: { id: 'side-1', name: 'Blue', type: SideType.BLUE },
  },
  updatedAt: new Date('2026-10-28T12:00:00Z'),
};

const options = { frontendUrl: 'https://vtg.example', includeRoles: true };

describe('buildAccountClaims', () => {
  it('releases standard claims, the aliases apps look for, roles and squad', () => {
    expect(buildAccountClaims(account, 'active', false, options)).toEqual({
      sub: 'user-1',
      name: 'Sokil',
      nickname: 'Sokil',
      preferred_username: 'Sokil',
      displayName: 'Sokil',
      username: 'Sokil',
      picture: 'https://legacy.example/avatar.png',
      profile: 'https://vtg.example/profile/user-1',
      locale: 'uk',
      zoneinfo: 'Europe/Kyiv',
      updated_at: 1793188800,
      email: 'sokil@example.com',
      email_verified: true,
      roles: ['USER', 'GAME_ADMIN'],
      groups: ['USER', 'GAME_ADMIN'],
      squad: { id: 'squad-1', name: 'Bravo', tag: 'BRV' },
      squad_role: 'HQ',
      side: { id: 'side-1', name: 'Blue', type: 'BLUE' },
      steam_id: '76561197960287930',
      game_access: true,
      banned_until: null,
      muted: false,
    });
  });

  it('leaves roles out unless they may be released', () => {
    const claims = buildAccountClaims(account, 'active', false, {
      ...options,
      includeRoles: false,
    });
    expect(claims).not.toHaveProperty('roles');
    expect(claims).not.toHaveProperty('groups');
  });

  it('prefers the uploaded avatar', () => {
    const claims = buildAccountClaims(
      { ...account, avatar: { url: 'https://files.example/avatar.webp' } },
      'active',
      false,
      options,
    );
    expect(claims.picture).toBe('https://files.example/avatar.webp');
  });

  it('reports a temporary ban as lost game access', () => {
    const bannedUntil = new Date('2026-11-12T18:00:00Z');
    const claims = buildAccountClaims(
      { ...account, status: UserStatus.BANNED, bannedUntil, isMuted: true },
      'temporarily_banned',
      true,
      options,
    );

    expect(claims).toMatchObject({
      game_access: false,
      banned_until: '2026-11-12T18:00:00.000Z',
      muted: true,
    });
  });

  it('has no squad role without a squad', () => {
    const claims = buildAccountClaims(
      { ...account, squad: null, squadRole: SquadRole.MEMBER },
      'active',
      false,
      options,
    );
    expect(claims).toMatchObject({ squad: null, squad_role: null, side: null });
  });
});

describe('includeRolesClaims', () => {
  it('releases roles with the roles scope to any app', () => {
    expect(includeRolesClaims('openid roles', false)).toBe(true);
    expect(includeRolesClaims('openid roles', true)).toBe(true);
  });

  it('releases roles with profile to first-party apps only', () => {
    expect(includeRolesClaims('openid profile email', true)).toBe(true);
    expect(includeRolesClaims('openid profile email', false)).toBe(false);
  });

  it('keeps roles from an app that asked for neither', () => {
    expect(includeRolesClaims('openid email', true)).toBe(false);
  });
});
