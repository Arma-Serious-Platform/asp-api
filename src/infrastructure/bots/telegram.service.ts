import { Injectable, Logger } from '@nestjs/common';

const TELEGRAM_API = 'https://api.telegram.org';
const TELEGRAM_ALL_CHANNELS = '*';

export type TelegramChannelCreds = {
  token: string;
  channelId: string;
};

type TelegramApiPayload = {
  ok?: boolean;
  description?: string;
  result?: unknown;
};

type TelegramUpdate = {
  message?: { chat?: { id?: number | string } };
  edited_message?: { chat?: { id?: number | string } };
  channel_post?: { chat?: { id?: number | string } };
  edited_channel_post?: { chat?: { id?: number | string } };
  my_chat_member?: { chat?: { id?: number | string } };
  chat_member?: { chat?: { id?: number | string } };
};

@Injectable()
export class TelegramService {
  private readonly logger = new Logger(TelegramService.name);

  private extractChatId(update: TelegramUpdate): string | null {
    const chat =
      update.message?.chat ||
      update.edited_message?.chat ||
      update.channel_post?.chat ||
      update.edited_channel_post?.chat ||
      update.my_chat_member?.chat ||
      update.chat_member?.chat;
    if (chat?.id == null) {
      return null;
    }
    return String(chat.id);
  }

  /**
   * When channelId is "*", discover chats the bot has recently seen via getUpdates
   * and return those IDs. Otherwise returns the explicit channel id.
   */
  async resolveChannelIds(creds: TelegramChannelCreds): Promise<string[]> {
    const token = creds.token?.trim();
    const channelId = creds.channelId?.trim();
    if (!token || !channelId) {
      return [];
    }
    if (channelId !== TELEGRAM_ALL_CHANNELS) {
      return [channelId];
    }
    return this.discoverChatIds(token);
  }

  async discoverChatIds(token: string): Promise<string[]> {
    try {
      const response = await fetch(`${TELEGRAM_API}/bot${token}/getUpdates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limit: 100, timeout: 0 }),
      });
      const payload = (await response.json().catch(() => null)) as TelegramApiPayload | null;
      if (!response.ok || !payload?.ok || !Array.isArray(payload.result)) {
        this.logger.warn(
          `Telegram discover chats failed: ${
            payload?.description || `status ${response.status}`
          }`,
        );
        return [];
      }

      const ids = new Set<string>();
      for (const update of payload.result as TelegramUpdate[]) {
        const chatId = this.extractChatId(update);
        if (chatId) {
          ids.add(chatId);
        }
      }

      if (!ids.size) {
        this.logger.warn(
          'Telegram channelId "*" set, but no chats found via getUpdates (bot may use a webhook or have no recent activity)',
        );
      }

      return [...ids];
    } catch (error) {
      this.logger.warn(
        `Telegram discover chats failed: ${error instanceof Error ? error.message : error}`,
      );
      return [];
    }
  }

  private async callApi(
    creds: TelegramChannelCreds,
    method: string,
    body: Record<string, unknown> | FormData,
  ) {
    const token = creds.token?.trim();
    const channelId = creds.channelId?.trim();
    if (!token || !channelId || channelId === TELEGRAM_ALL_CHANNELS) {
      this.logger.debug(`Telegram skipped (${method}): token or channel id missing`);
      return null;
    }

    const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
    const response = await fetch(`${TELEGRAM_API}/bot${token}/${method}`, {
      method: 'POST',
      ...(isFormData
        ? { body }
        : {
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: channelId,
              ...(body as Record<string, unknown>),
            }),
          }),
    });

    const payload = (await response.json().catch(() => null)) as TelegramApiPayload | null;

    if (!response.ok || !payload?.ok) {
      throw new Error(
        payload?.description || `Telegram ${method} failed with status ${response.status}`,
      );
    }

    return payload;
  }

  private async forEachChannel(
    creds: TelegramChannelCreds,
    sendOne: (channelCreds: TelegramChannelCreds) => Promise<void>,
  ) {
    const channelIds = await this.resolveChannelIds(creds);
    await Promise.all(
      channelIds.map((channelId) => sendOne({ token: creds.token, channelId })),
    );
  }

  async sendMessage(
    creds: TelegramChannelCreds,
    text: string,
    options?: { parseMode?: 'HTML' | 'Markdown' },
  ) {
    await this.forEachChannel(creds, async (channelCreds) => {
      try {
        await this.callApi(channelCreds, 'sendMessage', {
          text,
          disable_web_page_preview: false,
          ...(options?.parseMode ? { parse_mode: options.parseMode } : {}),
        });
      } catch (error) {
        this.logger.error(
          `Failed to send Telegram message to ${channelCreds.channelId}: ${
            error instanceof Error ? error.message : error
          }`,
        );
      }
    });
  }

  async sendPhoto(
    creds: TelegramChannelCreds,
    photoUrl: string,
    caption?: string,
    options?: { parseMode?: 'HTML' | 'Markdown' },
  ) {
    await this.forEachChannel(creds, async (channelCreds) => {
      try {
        await this.callApi(channelCreds, 'sendPhoto', {
          photo: photoUrl,
          ...(caption ? { caption } : {}),
          ...(options?.parseMode ? { parse_mode: options.parseMode } : {}),
        });
      } catch (error) {
        this.logger.error(
          `Failed to send Telegram photo to ${channelCreds.channelId}: ${
            error instanceof Error ? error.message : error
          }`,
        );
      }
    });
  }

  async sendPhotoFile(
    creds: TelegramChannelCreds,
    file: { buffer: Buffer; filename: string; contentType?: string },
    caption?: string,
    options?: { parseMode?: 'HTML' | 'Markdown' },
  ) {
    await this.forEachChannel(creds, async (channelCreds) => {
      try {
        const form = new FormData();
        form.append('chat_id', channelCreds.channelId.trim());
        form.append(
          'photo',
          new Blob([new Uint8Array(file.buffer)], { type: file.contentType || 'image/webp' }),
          file.filename,
        );
        if (caption) {
          form.append('caption', caption);
        }
        if (options?.parseMode) {
          form.append('parse_mode', options.parseMode);
        }
        await this.callApi(channelCreds, 'sendPhoto', form);
      } catch (error) {
        this.logger.error(
          `Failed to send Telegram photo file to ${channelCreds.channelId}: ${
            error instanceof Error ? error.message : error
          }`,
        );
      }
    });
  }
}
