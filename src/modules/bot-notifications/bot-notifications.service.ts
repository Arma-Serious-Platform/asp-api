import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BotNotificationType, State, UserRole } from '@prisma/client';
import { PrismaService } from 'src/infrastructure/prisma/prisma.service';
import { ChannelAnnouncementsService } from 'src/infrastructure/bots/channel-announcements.service';
import { hasAnyRole } from 'src/shared/utils/user-roles';
import { CreateBotNotificationDto } from './dto/create-bot-notification.dto';
import { UpdateBotNotificationDto } from './dto/update-bot-notification.dto';

const FULL_MANAGE_ROLES: UserRole[] = [UserRole.OWNER, UserRole.SERVER_ADMIN];
const SEND_MANUAL_ROLES: UserRole[] = [
  UserRole.OWNER,
  UserRole.SERVER_ADMIN,
  UserRole.GAME_ADMIN,
  UserRole.MINI_ADMIN,
];

@Injectable()
export class BotNotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly channelAnnouncements: ChannelAnnouncementsService,
  ) {}

  canFullyManage(roles: UserRole[]) {
    return hasAnyRole(roles, FULL_MANAGE_ROLES);
  }

  canSendManual(roles: UserRole[]) {
    return hasAnyRole(roles, SEND_MANUAL_ROLES);
  }

  private redact(bot: {
    id: string;
    name: string;
    type: BotNotificationType;
    telegramToken: string | null;
    telegramChannelId: string | null;
    discordToken: string | null;
    discordChannelId: string | null;
    status: State;
    url: string | null;
    createdAt: Date;
    updatedAt: Date;
  }, includeTokens: boolean) {
    return {
      ...bot,
      telegramToken: includeTokens ? bot.telegramToken : null,
      discordToken: includeTokens ? bot.discordToken : null,
      hasTelegram: Boolean(bot.telegramToken && bot.telegramChannelId),
      hasDiscord: Boolean(bot.discordToken && bot.discordChannelId),
    };
  }

  async findAll(roles: UserRole[]) {
    const fullManage = this.canFullyManage(roles);
    if (!fullManage && !this.canSendManual(roles)) {
      throw new ForbiddenException();
    }

    const data = await this.prisma.botNotification.findMany({
      where: fullManage ? undefined : { type: BotNotificationType.MANUAL },
      orderBy: [{ type: 'asc' }, { name: 'asc' }],
    });

    return data.map((bot) => this.redact(bot, fullManage));
  }

  async findById(id: string, roles: UserRole[]) {
    const fullManage = this.canFullyManage(roles);
    if (!fullManage && !this.canSendManual(roles)) {
      throw new ForbiddenException();
    }

    const bot = await this.prisma.botNotification.findUnique({ where: { id } });
    if (!bot) {
      throw new NotFoundException('Bot notification not found');
    }
    if (!fullManage && bot.type !== BotNotificationType.MANUAL) {
      throw new NotFoundException('Bot notification not found');
    }

    return this.redact(bot, fullManage);
  }

  create(dto: CreateBotNotificationDto) {
    return this.prisma.botNotification.create({
      data: {
        name: dto.name.trim(),
        type: dto.type,
        status: dto.status ?? State.ACTIVE,
        telegramToken: dto.telegramToken?.trim() || null,
        telegramChannelId: dto.telegramChannelId?.trim() || null,
        discordToken: dto.discordToken?.trim() || null,
        discordChannelId: dto.discordChannelId?.trim() || null,
        url: dto.url?.trim() || null,
      },
    });
  }

  async update(id: string, dto: UpdateBotNotificationDto) {
    const existing = await this.prisma.botNotification.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Bot notification not found');
    }

    return this.prisma.botNotification.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name.trim() }),
        ...(dto.type !== undefined && { type: dto.type }),
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.telegramToken !== undefined && {
          telegramToken: dto.telegramToken?.trim() || null,
        }),
        ...(dto.telegramChannelId !== undefined && {
          telegramChannelId: dto.telegramChannelId?.trim() || null,
        }),
        ...(dto.discordToken !== undefined && {
          discordToken: dto.discordToken?.trim() || null,
        }),
        ...(dto.discordChannelId !== undefined && {
          discordChannelId: dto.discordChannelId?.trim() || null,
        }),
        ...(dto.url !== undefined && { url: dto.url?.trim() || null }),
      },
    });
  }

  async delete(id: string) {
    const existing = await this.prisma.botNotification.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Bot notification not found');
    }

    await this.prisma.botNotification.delete({ where: { id } });
    return { message: 'Bot notification deleted successfully' };
  }

  async sendManual(id: string, message: string, roles: UserRole[]) {
    if (!this.canSendManual(roles)) {
      throw new ForbiddenException();
    }

    const bot = await this.prisma.botNotification.findUnique({ where: { id } });
    if (!bot) {
      throw new NotFoundException('Bot notification not found');
    }
    if (bot.type !== BotNotificationType.MANUAL) {
      throw new BadRequestException('Only MANUAL bot notifications can send freeform messages');
    }
    if (bot.status !== State.ACTIVE) {
      throw new BadRequestException('Bot notification is disabled');
    }
    if (
      !((bot.telegramToken && bot.telegramChannelId) || (bot.discordToken && bot.discordChannelId))
    ) {
      throw new BadRequestException('Bot notification has no configured channels');
    }

    await this.channelAnnouncements.announceManual(bot, message);
    return { message: 'Notification sent' };
  }
}
