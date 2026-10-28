import { ForbiddenException } from '@nestjs/common';
import { UserStatus } from '@prisma/client';
import { UserRestrictionsService } from './user-restrictions.service';

describe('UserRestrictionsService', () => {
  const prisma = {
    user: {
      findUnique: jest.fn(),
    },
  };

  const service = new UserRestrictionsService(prisma as never);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('detects permanent bans only when bannedUntil is null', () => {
    expect(
      service.isPermanentBan({
        status: UserStatus.BANNED,
        bannedUntil: null,
      }),
    ).toBe(true);

    expect(
      service.isPermanentBan({
        status: UserStatus.BANNED,
        bannedUntil: new Date(Date.now() + 60_000),
      }),
    ).toBe(false);
  });

  it('maps restrictions to the account state', () => {
    const now = new Date('2026-10-28T12:00:00Z');

    expect(
      service.getAccountState(
        { status: UserStatus.ACTIVE, bannedUntil: null },
        now,
      ),
    ).toBe('active');
    expect(
      service.getAccountState(
        {
          status: UserStatus.BANNED,
          bannedUntil: new Date('2026-10-29T12:00:00Z'),
        },
        now,
      ),
    ).toBe('temporarily_banned');
    expect(
      service.getAccountState(
        { status: UserStatus.BANNED, bannedUntil: null },
        now,
      ),
    ).toBe('deleted');
  });

  it('treats an expired temporary ban as active before the cron lifts it', () => {
    expect(
      service.getAccountState(
        {
          status: UserStatus.BANNED,
          bannedUntil: new Date('2026-10-28T11:59:00Z'),
        },
        new Date('2026-10-28T12:00:00Z'),
      ),
    ).toBe('active');
  });

  it('treats mute as inactive after bannedUntil expires', () => {
    expect(
      service.isCommunicationMuted({
        status: UserStatus.BANNED,
        bannedUntil: new Date(Date.now() - 60_000),
        isMuted: true,
      }),
    ).toBe(false);
  });

  it('blocks communication while muted temporary ban is active', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      status: UserStatus.BANNED,
      bannedUntil: new Date(Date.now() + 60_000),
      isMuted: true,
    });

    await expect(service.assertCanCommunicate('user-1')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('allows communication when mute is false', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      status: UserStatus.BANNED,
      bannedUntil: new Date(Date.now() + 60_000),
      isMuted: false,
    });

    await expect(
      service.assertCanCommunicate('user-1'),
    ).resolves.toBeUndefined();
  });
});
