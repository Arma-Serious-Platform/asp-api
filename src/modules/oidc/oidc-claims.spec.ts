import { SideType, SquadRole, UserRole, UserStatus } from '@prisma/client';
import { OidcAccount, buildAccountClaims } from './oidc-claims';

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

describe('buildAccountClaims', () => {
  it('releases the current profile, roles and squad', () => {
    expect(buildAccountClaims(account, 'active', false)).toEqual({
      sub: 'user-1',
      name: 'Sokil',
      nickname: 'Sokil',
      preferred_username: 'Sokil',
      picture: 'https://legacy.example/avatar.png',
      updated_at: 1793188800,
      email: 'sokil@example.com',
      email_verified: true,
      asp_roles: ['USER', 'GAME_ADMIN'],
      squad: { id: 'squad-1', name: 'Bravo', tag: 'BRV' },
      squad_role: 'HQ',
      side: { id: 'side-1', name: 'Blue', type: 'BLUE' },
      steam_id: '76561197960287930',
      game_access: true,
      banned_until: null,
      muted: false,
    });
  });

  it('prefers the uploaded avatar', () => {
    const claims = buildAccountClaims(
      { ...account, avatar: { url: 'https://files.example/avatar.webp' } },
      'active',
      false,
    );
    expect(claims.picture).toBe('https://files.example/avatar.webp');
  });

  it('reports a temporary ban as lost game access', () => {
    const bannedUntil = new Date('2026-11-12T18:00:00Z');
    const claims = buildAccountClaims(
      { ...account, status: UserStatus.BANNED, bannedUntil, isMuted: true },
      'temporarily_banned',
      true,
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
    );
    expect(claims).toMatchObject({ squad: null, squad_role: null, side: null });
  });
});
