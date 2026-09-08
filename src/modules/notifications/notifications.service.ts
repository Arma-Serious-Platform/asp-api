import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import {
  NotificationGroup,
  NotificationType,
  Prisma,
  UserStatus,
} from '@prisma/client';
import { PrismaService } from 'src/infrastructure/prisma/prisma.service';
import { FindNotificationsDto } from './dto/find-notifications.dto';
import { UpdateNotificationPreferencesDto } from './dto/update-notification-preferences.dto';
import { NotificationsGateway } from './notifications.gateway';

export type NotifyDb = Prisma.TransactionClient | PrismaService;

export type NotifyParams = {
  recipientIds: string[];
  actorId?: string | null;
  type: NotificationType;
  group: NotificationGroup;
  targetId?: string | null;
  payload?: Prisma.InputJsonValue;
  createdAt?: Date;
};

const ALL_GROUPS = Object.values(NotificationGroup);

const actorSelect = {
  id: true,
  nickname: true,
  roles: true,
  squadRole: true,
  avatar: {
    select: {
      id: true,
      url: true,
    },
  },
  squad: {
    select: {
      tag: true,
      side: {
        select: {
          type: true,
        },
      },
    },
  },
} satisfies Prisma.UserSelect;

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: NotificationsGateway,
  ) {}

  async notify(db: NotifyDb, params: NotifyParams) {
    const uniqueRecipientIds = [
      ...new Set(
        params.recipientIds.filter(
          (id) => id && id !== params.actorId,
        ),
      ),
    ];

    if (uniqueRecipientIds.length === 0) {
      return { count: 0 };
    }

    const disabledPrefs = await db.notificationPreference.findMany({
      where: {
        userId: { in: uniqueRecipientIds },
        group: params.group,
        enabled: false,
      },
      select: { userId: true },
    });

    const disabledUserIds = new Set(disabledPrefs.map((pref) => pref.userId));
    const recipientIds = uniqueRecipientIds.filter(
      (id) => !disabledUserIds.has(id),
    );

    if (recipientIds.length === 0) {
      return { count: 0 };
    }

    const createdAt = params.createdAt ?? new Date();
    const payload = params.payload ?? {};

    await db.notification.createMany({
      data: recipientIds.map((recipientId) => ({
        id: crypto.randomUUID(),
        recipientId,
        actorId: params.actorId ?? null,
        type: params.type,
        group: params.group,
        targetId: params.targetId ?? null,
        payload,
        createdAt,
      })),
    });

    this.gateway.emitToUsers(recipientIds, {
      group: params.group,
      type: params.type,
    });

    return { count: recipientIds.length };
  }

  /**
   * Fan-out to all ACTIVE users except actor, respecting preferences.
   * Used for weekend publish announcements.
   */
  async notifyAllActiveUsers(params: Omit<NotifyParams, 'recipientIds'>) {
    const disabledPrefs = await this.prisma.notificationPreference.findMany({
      where: {
        group: params.group,
        enabled: false,
      },
      select: { userId: true },
    });
    const disabledUserIds = new Set(disabledPrefs.map((pref) => pref.userId));

    const batchSize = 500;
    let cursor: string | undefined;
    let total = 0;
    const createdAt = params.createdAt ?? new Date();

    for (;;) {
      const users = await this.prisma.user.findMany({
        where: {
          status: UserStatus.ACTIVE,
          ...(params.actorId ? { id: { not: params.actorId } } : {}),
        },
        select: { id: true },
        take: batchSize,
        ...(cursor
          ? {
              skip: 1,
              cursor: { id: cursor },
            }
          : {}),
        orderBy: { id: 'asc' },
      });

      if (users.length === 0) {
        break;
      }

      const recipientIds = users
        .map((user) => user.id)
        .filter((id) => !disabledUserIds.has(id));

      if (recipientIds.length > 0) {
        await this.prisma.notification.createMany({
          data: recipientIds.map((recipientId) => ({
            id: crypto.randomUUID(),
            recipientId,
            actorId: params.actorId ?? null,
            type: params.type,
            group: params.group,
            targetId: params.targetId ?? null,
            payload: params.payload ?? {},
            createdAt,
          })),
        });
        this.gateway.emitToUsers(recipientIds, {
          group: params.group,
          type: params.type,
        });
        total += recipientIds.length;
      }

      cursor = users[users.length - 1]?.id;
      if (users.length < batchSize) {
        break;
      }
    }

    return { count: total };
  }

  async findForUser(userId: string, dto: FindNotificationsDto) {
    const skip = Number(dto.skip ?? 0);
    const take = Number(dto.take ?? 50);

    const where: Prisma.NotificationWhereInput = {
      recipientId: userId,
      ...(dto.group ? { group: dto.group } : {}),
    };

    const [total, data] = await this.prisma.$transaction([
      this.prisma.notification.count({ where }),
      this.prisma.notification.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          actor: {
            select: actorSelect,
          },
        },
      }),
    ]);

    return { data, total };
  }

  async getUnreadCount(userId: string) {
    const unread = await this.prisma.notification.groupBy({
      by: ['group'],
      where: {
        recipientId: userId,
        readAt: null,
      },
      _count: { _all: true },
    });

    const byGroup = Object.fromEntries(
      ALL_GROUPS.map((group) => [group, 0]),
    ) as Record<NotificationGroup, number>;

    for (const row of unread) {
      byGroup[row.group] = row._count._all;
    }

    const total = Object.values(byGroup).reduce((sum, count) => sum + count, 0);

    return { total, byGroup };
  }

  async markAsRead(notificationId: string, userId: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    if (notification.recipientId !== userId) {
      throw new ForbiddenException('You cannot mark this notification as read');
    }

    if (notification.readAt) {
      return notification;
    }

    return this.prisma.notification.update({
      where: { id: notificationId },
      data: { readAt: new Date() },
      include: {
        actor: {
          select: actorSelect,
        },
      },
    });
  }

  async markAllAsRead(userId: string, group?: NotificationGroup) {
    const result = await this.prisma.notification.updateMany({
      where: {
        recipientId: userId,
        readAt: null,
        ...(group ? { group } : {}),
      },
      data: { readAt: new Date() },
    });

    return { count: result.count };
  }

  async getPreferences(userId: string) {
    const stored = await this.prisma.notificationPreference.findMany({
      where: { userId },
    });

    const byGroup = new Map(stored.map((pref) => [pref.group, pref.enabled]));

    return {
      preferences: ALL_GROUPS.map((group) => ({
        group,
        enabled: byGroup.get(group) ?? true,
      })),
    };
  }

  async updatePreferences(
    userId: string,
    dto: UpdateNotificationPreferencesDto,
  ) {
    await this.prisma.$transaction(
      dto.preferences.map((pref) =>
        this.prisma.notificationPreference.upsert({
          where: {
            userId_group: {
              userId,
              group: pref.group,
            },
          },
          create: {
            userId,
            group: pref.group,
            enabled: pref.enabled,
          },
          update: {
            enabled: pref.enabled,
          },
        }),
      ),
    );

    return this.getPreferences(userId);
  }
}
