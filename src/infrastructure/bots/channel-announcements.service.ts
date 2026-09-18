import { Injectable, Logger } from '@nestjs/common';
import { extractLexicalPlainText } from 'src/utils/extract-lexical-plain-text';
import { TelegramService } from './telegram.service';

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

@Injectable()
export class ChannelAnnouncementsService {
  private readonly logger = new Logger(ChannelAnnouncementsService.name);

  constructor(private readonly telegram: TelegramService) {}

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

  /** Telegram has no text colors — use side-colored circle emojis. */
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

  private coloredSideLabel(name: string, type: SideColor) {
    return `${this.sideEmoji(type)} ${this.escapeHtml(name)}`;
  }

  private formatFaction(
    gameSideName: string,
    gameSideType: SideColor,
    squadSideName?: string | null,
    squadSideType?: SideColor,
  ) {
    const gameLabel = this.coloredSideLabel(gameSideName, gameSideType);
    if (!squadSideName) {
      return gameLabel;
    }
    return `${gameLabel} (${this.coloredSideLabel(squadSideName, squadSideType)})`;
  }

  async announceNews(news: NewsAnnouncementPayload) {
    try {
      const link = this.resolveNewsUrl(news.id);
      const shortDescription = extractLexicalPlainText(news.shortDescription, 800);
      const title = news.title?.trim() || 'Новина';

      const lines = [
        `📰 <b>${this.escapeHtml(title)}</b>`,
        shortDescription ? this.escapeHtml(shortDescription) : null,
        `🔗 <a href="${this.escapeHtml(link)}">${this.escapeHtml(link)}</a>`,
      ].filter(Boolean) as string[];

      const text = lines.join('\n\n');
      const photoUrl = news.image?.url?.trim();

      if (photoUrl) {
        await this.telegram.sendPhoto(photoUrl, this.truncate(text, TELEGRAM_CAPTION_MAX), {
          parseMode: 'HTML',
        });
        return;
      }

      await this.telegram.sendMessage(text, { parseMode: 'HTML' });
    } catch (error) {
      this.logger.error(
        `Failed to announce news ${news.id}: ${error instanceof Error ? error.message : error}`,
      );
    }
  }

  async announceWeekend(weekend: WeekendAnnouncementPayload) {
    try {
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
        );
        const defense = this.formatFaction(
          defenseGameSide,
          game.missionVersion?.defenseSideType,
          game.defenseSide?.name,
          game.defenseSide?.type,
        );

        return [
          `🎮 <b>${this.escapeHtml(missionName)}</b>`,
          `${attack}  ⚔️  ${defense}`,
        ].join('\n');
      });

      const lines = [
        `📅 <b>${this.escapeHtml(weekend.name)}</b>`,
        gameBlocks.length > 0 ? gameBlocks.join('\n\n') : null,
        `🔗 <a href="${this.escapeHtml(link)}">${this.escapeHtml(link)}</a>`,
      ].filter(Boolean) as string[];

      await this.telegram.sendMessage(lines.join('\n\n'), { parseMode: 'HTML' });
    } catch (error) {
      this.logger.error(
        `Failed to announce weekend ${weekend.id}: ${
          error instanceof Error ? error.message : error
        }`,
      );
    }
  }
}
