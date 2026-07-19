import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import {
  UserHistoryEventType,
  UserPunishmentType,
  UserStatus,
} from '@prisma/client';
import { PrismaService } from 'src/infrastructure/prisma/prisma.service';
import { UsersHistoryService } from './users-history.service';

const AUTOMATIC_UNBAN_REASON = 'Термін тимчасового блокування завершився';
const DEFAULT_CHECK_INTERVAL_MS = 60 * 60 * 1000;
const CHECK_INTERVAL_NAME = 'expired-user-bans';

@Injectable()
export class UsersBanExpirationService implements OnApplicationBootstrap {
  private readonly logger = new Logger(UsersBanExpirationService.name);
  private isRunning = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly usersHistoryService: UsersHistoryService,
    private readonly configService: ConfigService,
    private readonly schedulerRegistry: SchedulerRegistry,
  ) {}

  onApplicationBootstrap() {
    const configuredInterval = Number(
      this.configService.get('BAN_EXPIRY_CHECK_INTERVAL_MS'),
    );
    const intervalMs =
      Number.isFinite(configuredInterval) && configuredInterval > 0
        ? configuredInterval
        : DEFAULT_CHECK_INTERVAL_MS;

    const interval = setInterval(
      () => void this.unbanExpiredUsers(),
      intervalMs,
    );
    this.schedulerRegistry.addInterval(CHECK_INTERVAL_NAME, interval);

    void this.unbanExpiredUsers();
  }

  async unbanExpiredUsers() {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;

    try {
      const now = new Date();
      const users = await this.prisma.user.findMany({
        where: {
          status: UserStatus.BANNED,
          bannedUntil: {
            not: null,
            lte: now,
          },
        },
        select: { id: true },
      });

      let unbannedCount = 0;

      for (const user of users) {
        const wasUnbanned = await this.prisma.$transaction(async (tx) => {
          const result = await tx.user.updateMany({
            where: {
              id: user.id,
              status: UserStatus.BANNED,
              bannedUntil: {
                not: null,
                lte: now,
              },
            },
            data: {
              status: UserStatus.ACTIVE,
              bannedUntil: null,
              isMuted: false,
            },
          });

          if (result.count === 0) {
            return false;
          }

          const punishment = await tx.userPunishment.create({
            data: {
              userId: user.id,
              type: UserPunishmentType.UNBAN,
              reason: AUTOMATIC_UNBAN_REASON,
            },
          });

          await this.usersHistoryService.append(tx, {
            userId: user.id,
            type: UserHistoryEventType.UNBAN,
            payload: {
              reason: AUTOMATIC_UNBAN_REASON,
              punishmentId: punishment.id,
            },
          });

          return true;
        });

        if (wasUnbanned) {
          unbannedCount += 1;
        }
      }

      if (unbannedCount > 0) {
        this.logger.log(`Automatically unbanned ${unbannedCount} user(s)`);
      }
    } catch (error) {
      this.logger.error('Failed to automatically unban expired users', error);
    } finally {
      this.isRunning = false;
    }
  }
}
