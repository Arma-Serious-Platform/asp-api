import { Injectable, Logger } from '@nestjs/common';
import { BotNotification, BotNotificationType, NewsType, State } from '@prisma/client';
import { extractLexicalPlainText } from 'src/utils/extract-lexical-plain-text';
import { PrismaService } from 'src/infrastructure/prisma/prisma.service';
import { TelegramService } from './telegram.service';
import { DiscordService } from './discord.service';

const TELEGRAM_CAPTION_MAX = 1024;

const NEWS_BOT_TYPE_BY_NEWS: Record<NewsType, BotNotificationType> = {
  [NewsType.INFO]: BotNotificationType.NEWS_INFO,
  [NewsType.TECH_UPDATE]: BotNotificationType.NEWS_TECH_UPDATE,
  [NewsType.WEBSITE_UPDATE]: BotNotificationType.NEWS_WEBSITE_UPDATE,
};

type SideColor = 'BLUE' | 'RED' | 'GREEN' | string | null | undefined;

type NewsAnnouncementPayload = {
  id: string;
  title: string;
  type: NewsType;
  shortDescription?: unknown;
  image?: { url?: string | null } | null;
};

type WeekendGameAnnouncement = {
  position?: number | null;
  mission?: { name?: string | null } | null;
  missionVersion?: {
    mission?: { name?: string | null } | null;
    attackSideName?: string | null;
    defenseSideName?: string | null;
    attackSideType?: SideColor;
    defenseSideType?: SideColor;
    attackSideSlots?: number | null;
    defenseSideSlots?: number | null;
    friendlySideName?: string | null;
    friendlySideType?: SideColor;
  } | null;
};

type WeekendAnnouncementPayload = {
  id: string;
  name: string;
  games?: WeekendGameAnnouncement[] | null;
};

type FormatMode = 'html' | 'markdown';

type DeliveryTarget = Pick<
  BotNotification,
  'id' | 'name' | 'url' | 'telegramToken' | 'telegramChannelId' | 'discordToken' | 'discordChannelId'
>;

@Injectable()
export class ChannelAnnouncementsService {
  private readonly logger = new Logger(ChannelAnnouncementsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly telegram: TelegramService,
    private readonly discord: DiscordService,
  ) {}

  private async findActiveTargets(
    type: BotNotificationType | BotNotificationType[],
  ): Promise<DeliveryTarget[]> {
    return this.prisma.botNotification.findMany({
      where: {
        type: Array.isArray(type) ? { in: type } : type,
        status: State.ACTIVE,
      },
      select: {
        id: true,
        name: true,
        url: true,
        telegramToken: true,
        telegramChannelId: true,
        discordToken: true,
        discordChannelId: true,
      },
    });
  }

  private newsBotTypes(newsType: NewsType): BotNotificationType[] {
    return [BotNotificationType.NEWS, NEWS_BOT_TYPE_BY_NEWS[newsType]];
  }

  private resolveUrl(template: string | null | undefined, id?: string) {
    const url = template?.trim();
    if (!url) {
      return null;
    }
    if (id && url.includes(':id')) {
      return url.replace(':id', id);
    }
    return url;
  }

  private truncate(text: string, max: number) {
    if (text.length <= max) {
      return text;
    }
    return `${text.slice(0, Math.max(0, max - 1)).trimEnd()}…`;
  }

  private escapeHtml(text: string) {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  private escapeMarkdown(text: string) {
    return text.replace(/([\\_*`~|])/g, '\\$1');
  }

  private formatText(text: string, mode: FormatMode) {
    return mode === 'html' ? this.escapeHtml(text) : this.escapeMarkdown(text);
  }

  private bold(text: string, mode: FormatMode) {
    const safe = this.formatText(text, mode);
    return mode === 'html' ? `<b>${safe}</b>` : `**${safe}**`;
  }

  private newsLink(url: string, mode: FormatMode) {
    const safeUrl = mode === 'html' ? this.escapeHtml(url) : url;
    return mode === 'html'
      ? `Детальніше: <a href="${safeUrl}">${safeUrl}</a>`
      : `Детальніше: ${url}`;
  }

  private detailsLink(url: string, mode: FormatMode) {
    const safeUrl = mode === 'html' ? this.escapeHtml(url) : url;
    return mode === 'html'
      ? `Детальніше: <a href="${safeUrl}">${safeUrl}</a>`
      : `Детальніше: ${url}`;
  }

  private sideEmoji(type: SideColor) {
    switch (type) {
      case 'BLUE':
        return '🔵';
      case 'RED':
        return '🔴';
      case 'GREEN':
        return '🟢';
      default:
        return '⚪';
    }
  }

  private formatGameSide(
    name: string,
    type: SideColor,
    slots: number | null | undefined,
    mode: FormatMode,
  ) {
    const slotsLabel = slots == null ? '—' : String(slots);
    return `${this.sideEmoji(type)} ${this.formatText(name, mode)} (${slotsLabel})`;
  }

  private buildNewsLines(
    title: string,
    shortDescription: string,
    link: string | null,
    mode: FormatMode,
  ) {
    return [
      `📰 ${this.bold(title, mode)}`,
      shortDescription ? this.formatText(shortDescription, mode) : null,
      link ? this.newsLink(link, mode) : null,
    ].filter(Boolean) as string[];
  }

  private buildWeekendLines(
    weekend: WeekendAnnouncementPayload,
    link: string | null,
    mode: FormatMode,
  ) {
    const games = [...(weekend.games ?? [])].sort(
      (a, b) => (a.position ?? 0) - (b.position ?? 0),
    );

    const gameBlocks = games.map((game, index) => {
      const missionName =
        game.missionVersion?.mission?.name ||
        game.mission?.name ||
        `Гра ${index + 1}`;
      const attack = this.formatGameSide(
        game.missionVersion?.attackSideName || '—',
        game.missionVersion?.attackSideType,
        game.missionVersion?.attackSideSlots,
        mode,
      );
      const defense = this.formatGameSide(
        game.missionVersion?.defenseSideName || '—',
        game.missionVersion?.defenseSideType,
        game.missionVersion?.defenseSideSlots,
        mode,
      );

      return [`🎮 ${this.bold(missionName, mode)}`, `${attack}  vs  ${defense}`].join('\n');
    });

    return [
      `📅 ${this.bold(weekend.name, mode)}`,
      gameBlocks.length > 0 ? gameBlocks.join('\n\n') : null,
      link ? this.detailsLink(link, mode) : null,
    ].filter(Boolean) as string[];
  }

  private async downloadImage(url: string): Promise<{
    buffer: Buffer;
    filename: string;
    contentType: string;
  } | null> {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        this.logger.warn(`Failed to download news image (${response.status}): ${url}`);
        return null;
      }

      const contentType = response.headers.get('content-type') || 'image/webp';
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      if (!buffer.length) {
        return null;
      }

      const pathname = new URL(url).pathname;
      const rawName = pathname.split('/').pop() || 'news-image.webp';
      const filename = rawName.includes('.') ? rawName : `${rawName}.webp`;

      return { buffer, filename, contentType };
    } catch (error) {
      this.logger.warn(
        `Failed to download news image: ${error instanceof Error ? error.message : error}`,
      );
      return null;
    }
  }

  private telegramCreds(target: DeliveryTarget) {
    if (!target.telegramToken?.trim() || !target.telegramChannelId?.trim()) {
      return null;
    }
    return { token: target.telegramToken, channelId: target.telegramChannelId };
  }

  private discordCreds(target: DeliveryTarget) {
    if (!target.discordToken?.trim() || !target.discordChannelId?.trim()) {
      return null;
    }
    return { token: target.discordToken, channelId: target.discordChannelId };
  }

  async announceNews(news: NewsAnnouncementPayload) {
    try {
      const targets = await this.findActiveTargets(this.newsBotTypes(news.type));
      if (!targets.length) {
        return;
      }

      const shortDescription = extractLexicalPlainText(news.shortDescription, 800);
      const title = news.title?.trim() || 'Новина';
      const photoUrl = news.image?.url?.trim();
      const imageFile = photoUrl ? await this.downloadImage(photoUrl) : null;

      await Promise.all(
        targets.map(async (target) => {
          const link = this.resolveUrl(target.url, news.id);
          const telegramText = this.buildNewsLines(title, shortDescription, link, 'html').join(
            '\n\n',
          );
          const discordText = this.buildNewsLines(
            title,
            shortDescription,
            link,
            'markdown',
          ).join('\n\n');
          const telegram = this.telegramCreds(target);
          const discord = this.discordCreds(target);

          await Promise.all([
            telegram
              ? imageFile
                ? this.telegram.sendPhotoFile(
                    telegram,
                    imageFile,
                    this.truncate(telegramText, TELEGRAM_CAPTION_MAX),
                    { parseMode: 'HTML' },
                  )
                : photoUrl
                  ? this.telegram.sendPhoto(
                      telegram,
                      photoUrl,
                      this.truncate(telegramText, TELEGRAM_CAPTION_MAX),
                      { parseMode: 'HTML' },
                    )
                  : this.telegram.sendMessage(telegram, telegramText, { parseMode: 'HTML' })
              : Promise.resolve(),
            discord
              ? imageFile
                ? this.discord.sendEmbedWithFile(
                    discord,
                    {
                      title: `📰 ${title}`,
                      description: [
                        shortDescription || null,
                        link ? `Детальніше: ${link}` : null,
                      ]
                        .filter(Boolean)
                        .join('\n\n'),
                      url: link ?? undefined,
                      imageFilename: imageFile.filename,
                    },
                    imageFile,
                  )
                : photoUrl
                  ? this.discord.sendEmbed(discord, {
                      title: `📰 ${title}`,
                      description: [
                        shortDescription || null,
                        link ? `Детальніше: ${link}` : null,
                      ]
                        .filter(Boolean)
                        .join('\n\n'),
                      url: link ?? undefined,
                      image: { url: photoUrl },
                    })
                  : this.discord.sendMessage(discord, discordText)
              : Promise.resolve(),
          ]);
        }),
      );
    } catch (error) {
      this.logger.error(
        `Failed to announce news ${news.id}: ${error instanceof Error ? error.message : error}`,
      );
    }
  }

  async announceWeekend(weekend: WeekendAnnouncementPayload) {
    try {
      const targets = await this.findActiveTargets(BotNotificationType.WEEKENDS);
      if (!targets.length) {
        return;
      }

      await Promise.all(
        targets.map(async (target) => {
          const link = this.resolveUrl(target.url);
          const telegramText = this.buildWeekendLines(weekend, link, 'html').join('\n\n');
          const discordText = this.buildWeekendLines(weekend, link, 'markdown').join('\n\n');
          const telegram = this.telegramCreds(target);
          const discord = this.discordCreds(target);

          await Promise.all([
            telegram
              ? this.telegram.sendMessage(telegram, telegramText, { parseMode: 'HTML' })
              : Promise.resolve(),
            discord ? this.discord.sendMessage(discord, discordText) : Promise.resolve(),
          ]);
        }),
      );
    } catch (error) {
      this.logger.error(
        `Failed to announce weekend ${weekend.id}: ${
          error instanceof Error ? error.message : error
        }`,
      );
    }
  }

  async announceManual(target: DeliveryTarget, message: string) {
    const text = message.trim();
    if (!text) {
      return;
    }

    const link = this.resolveUrl(target.url);
    const telegram = this.telegramCreds(target);
    const discord = this.discordCreds(target);

    const telegramText = [
      this.escapeHtml(text),
      link ? this.detailsLink(link, 'html') : null,
    ]
      .filter(Boolean)
      .join('\n\n');
    const discordText = [text, link ? this.detailsLink(link, 'markdown') : null]
      .filter(Boolean)
      .join('\n\n');

    await Promise.all([
      telegram
        ? this.telegram.sendMessage(telegram, telegramText, { parseMode: 'HTML' })
        : Promise.resolve(),
      discord ? this.discord.sendMessage(discord, discordText) : Promise.resolve(),
    ]);
  }
}
