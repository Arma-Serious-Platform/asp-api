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
