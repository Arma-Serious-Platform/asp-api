import { Injectable, Logger } from '@nestjs/common';
import { extractLexicalPlainText } from 'src/utils/extract-lexical-plain-text';
import { TelegramService } from './telegram.service';
import { DiscordService } from './discord.service';

const TELEGRAM_CAPTION_MAX = 1024;
const DEFAULT_NEWS_URL = 'https://vtg.in.ua/news/:id';
const DEFAULT_WEEKENDS_URL = 'https://vtg.in.ua/weekends';

type SideColor = 'BLUE' | 'RED' | 'GREEN' | string | null | undefined;

type NewsAnnouncementPayload = {
  id: string;
  title: string;
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
    friendlySideName?: string | null;
    friendlySideType?: SideColor;
  } | null;
  attackSide?: { name?: string | null; type?: SideColor } | null;
  defenseSide?: { name?: string | null; type?: SideColor } | null;
};

type WeekendAnnouncementPayload = {
  id: string;
  name: string;
  games?: WeekendGameAnnouncement[] | null;
};

type FormatMode = 'html' | 'markdown';

@Injectable()
export class ChannelAnnouncementsService {
  private readonly logger = new Logger(ChannelAnnouncementsService.name);

  constructor(
    private readonly telegram: TelegramService,
    private readonly discord: DiscordService,
  ) {}

  private resolveNewsUrl(id: string) {
    const template = process.env.NEWS_PUBLIC_URL?.trim() || DEFAULT_NEWS_URL;
    return template.replace(':id', id);
  }

  private resolveWeekendsUrl() {
    return process.env.WEEKENDS_PUBLIC_URL?.trim() || DEFAULT_WEEKENDS_URL;
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

  private link(url: string, mode: FormatMode) {
    const safeUrl = mode === 'html' ? this.escapeHtml(url) : url;
    return mode === 'html'
      ? `🔗 <a href="${safeUrl}">${safeUrl}</a>`
      : `🔗 ${url}`;
  }

  /** Telegram/Discord plain text has no colors — use side-colored circle emojis. */
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

  private coloredSideLabel(name: string, type: SideColor, mode: FormatMode) {
    return `${this.sideEmoji(type)} ${this.formatText(name, mode)}`;
  }

  private formatFaction(
    gameSideName: string,
    gameSideType: SideColor,
    squadSideName: string | null | undefined,
    squadSideType: SideColor,
    mode: FormatMode,
  ) {
    const gameLabel = this.coloredSideLabel(gameSideName, gameSideType, mode);
    if (!squadSideName) {
      return gameLabel;
    }
    return `${gameLabel} (${this.coloredSideLabel(squadSideName, squadSideType, mode)})`;
  }

  private buildNewsLines(
    title: string,
    shortDescription: string,
    link: string,
    mode: FormatMode,
  ) {
    return [
      `📰 ${this.bold(title, mode)}`,
      shortDescription ? this.formatText(shortDescription, mode) : null,
      this.link(link, mode),
    ].filter(Boolean) as string[];
  }

  private buildWeekendLines(weekend: WeekendAnnouncementPayload, mode: FormatMode) {
    const link = this.resolveWeekendsUrl();
    const games = [...(weekend.games ?? [])].sort(
      (a, b) => (a.position ?? 0) - (b.position ?? 0),
    );

    const gameBlocks = games.map((game, index) => {
      const missionName =
        game.missionVersion?.mission?.name ||
        game.mission?.name ||
        `Гра ${index + 1}`;
      const attackGameSide = game.missionVersion?.attackSideName || '—';
      const defenseGameSide = game.missionVersion?.defenseSideName || '—';
      const attack = this.formatFaction(
        attackGameSide,
        game.missionVersion?.attackSideType,
        game.attackSide?.name,
        game.attackSide?.type,
        mode,
      );
      const defense = this.formatFaction(
        defenseGameSide,
        game.missionVersion?.defenseSideType,
        game.defenseSide?.name,
        game.defenseSide?.type,
        mode,
      );

      return [`🎮 ${this.bold(missionName, mode)}`, `${attack}  ⚔️  ${defense}`].join('\n');
    });

    return [
      `📅 ${this.bold(weekend.name, mode)}`,
      gameBlocks.length > 0 ? gameBlocks.join('\n\n') : null,
      this.link(link, mode),
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

  async announceNews(news: NewsAnnouncementPayload) {
    try {
      const link = this.resolveNewsUrl(news.id);
      const shortDescription = extractLexicalPlainText(news.shortDescription, 800);
      const title = news.title?.trim() || 'Новина';
      const photoUrl = news.image?.url?.trim();
      const imageFile = photoUrl ? await this.downloadImage(photoUrl) : null;

      const telegramText = this.buildNewsLines(title, shortDescription, link, 'html').join(
        '\n\n',
      );
      const discordText = this.buildNewsLines(title, shortDescription, link, 'markdown').join(
        '\n\n',
      );

      await Promise.all([
        imageFile
          ? this.telegram.sendPhotoFile(
              imageFile,
              this.truncate(telegramText, TELEGRAM_CAPTION_MAX),
              { parseMode: 'HTML' },
            )
          : photoUrl
            ? this.telegram.sendPhoto(photoUrl, this.truncate(telegramText, TELEGRAM_CAPTION_MAX), {
                parseMode: 'HTML',
              })
            : this.telegram.sendMessage(telegramText, { parseMode: 'HTML' }),
        imageFile
          ? this.discord.sendEmbedWithFile(
              {
                title: `📰 ${title}`,
                description: [shortDescription || null, `🔗 ${link}`]
                  .filter(Boolean)
                  .join('\n\n'),
                url: link,
                imageFilename: imageFile.filename,
              },
              imageFile,
            )
          : photoUrl
            ? this.discord.sendEmbed({
                title: `📰 ${title}`,
                description: [shortDescription || null, `🔗 ${link}`]
                  .filter(Boolean)
                  .join('\n\n'),
                url: link,
                image: { url: photoUrl },
              })
            : this.discord.sendMessage(discordText),
      ]);
    } catch (error) {
      this.logger.error(
        `Failed to announce news ${news.id}: ${error instanceof Error ? error.message : error}`,
      );
    }
  }

  async announceWeekend(weekend: WeekendAnnouncementPayload) {
    try {
      const telegramText = this.buildWeekendLines(weekend, 'html').join('\n\n');
      const discordText = this.buildWeekendLines(weekend, 'markdown').join('\n\n');

      await Promise.all([
        this.telegram.sendMessage(telegramText, { parseMode: 'HTML' }),
        this.discord.sendMessage(discordText),
      ]);
    } catch (error) {
      this.logger.error(
        `Failed to announce weekend ${weekend.id}: ${
          error instanceof Error ? error.message : error
        }`,
      );
    }
  }
}
