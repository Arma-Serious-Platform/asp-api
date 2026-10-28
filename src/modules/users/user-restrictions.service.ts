import { ForbiddenException, Injectable } from '@nestjs/common';
import { UserStatus } from '@prisma/client';
import { PrismaService } from 'src/infrastructure/prisma/prisma.service';

export const PERMANENT_BAN_LOGIN_MESSAGE = 'Вас забанено назавжди';
export const COMMUNICATION_MUTED_MESSAGE =
  'Вам заборонено писати повідомлення та коментарі на час блокування';

type RestrictionUser = {
  status: UserStatus;
  bannedUntil: Date | null;
  isMuted: boolean;
};

/**
 * - `active`: no restrictions.
 * - `temporarily_banned`: no access to the game server until `bannedUntil`;
 *   the account itself keeps working.
 * - `deleted`: permanently banned. Such an account is treated as removed.
 */
export type AccountState = 'active' | 'temporarily_banned' | 'deleted';

@Injectable()
export class UserRestrictionsService {
  constructor(private readonly prisma: PrismaService) {}

  isPermanentBan(user: Pick<RestrictionUser, 'status' | 'bannedUntil'>) {
    return user.status === UserStatus.BANNED && user.bannedUntil === null;
  }

  isTemporaryBanActive(
    user: Pick<RestrictionUser, 'status' | 'bannedUntil'>,
    now = new Date(),
  ) {
    return (
      user.status === UserStatus.BANNED &&
      user.bannedUntil !== null &&
      user.bannedUntil > now
    );
  }

  getAccountState(
    user: Pick<RestrictionUser, 'status' | 'bannedUntil'>,
    now = new Date(),
  ): AccountState {
    if (this.isPermanentBan(user)) {
      return 'deleted';
    }

    return this.isTemporaryBanActive(user, now)
      ? 'temporarily_banned'
      : 'active';
  }

  isCommunicationMuted(user: RestrictionUser, now = new Date()) {
    return user.isMuted && this.isTemporaryBanActive(user, now);
  }

  async getUserRestrictions(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        status: true,
        bannedUntil: true,
        isMuted: true,
      },
    });
  }

  async assertCanCommunicate(userId: string) {
    const user = await this.getUserRestrictions(userId);

    if (!user) {
      throw new ForbiddenException(COMMUNICATION_MUTED_MESSAGE);
    }

    if (this.isCommunicationMuted(user)) {
      throw new ForbiddenException(COMMUNICATION_MUTED_MESSAGE);
    }
  }
}
