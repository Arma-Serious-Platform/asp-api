import { Injectable, Logger } from '@nestjs/common';

const TELEGRAM_API = 'https://api.telegram.org';

@Injectable()
export class TelegramService {
  private readonly logger = new Logger(TelegramService.name);

  private get token() {
    return process.env.TELEGRAM_BOT_TOKEN?.trim() || '';
  }

  private get chatId() {
    return process.env.TELEGRAM_CHANNEL_ID?.trim() || '@virtual_tactical_games';
  }

  private get isConfigured() {
    return Boolean(this.token && this.chatId);
  }

  private async callApi(method: string, body: Record<string, unknown> | FormData) {
    if (!this.isConfigured) {
      this.logger.debug(`Telegram skipped (${method}): bot token or channel id missing`);
      return null;
    }

    const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
    const response = await fetch(`${TELEGRAM_API}/bot${this.token}/${method}`, {
      method: 'POST',
      ...(isFormData
        ? { body }
        : {
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: this.chatId,
              ...(body as Record<string, unknown>),
            }),
          }),
    });

    const payload = (await response.json().catch(() => null)) as {
      ok?: boolean;
      description?: string;
    } | null;

    if (!response.ok || !payload?.ok) {
      throw new Error(
        payload?.description || `Telegram ${method} failed with status ${response.status}`,
      );
    }

    return payload;
  }

  async sendMessage(text: string, options?: { parseMode?: 'HTML' | 'Markdown' }) {
    try {
      await this.callApi('sendMessage', {
        text,
        disable_web_page_preview: false,
        ...(options?.parseMode ? { parse_mode: options.parseMode } : {}),
      });
    } catch (error) {
      this.logger.error(
        `Failed to send Telegram message: ${error instanceof Error ? error.message : error}`,
      );
    }
  }

  async sendPhoto(photoUrl: string, caption?: string, options?: { parseMode?: 'HTML' | 'Markdown' }) {
    try {
      await this.callApi('sendPhoto', {
        photo: photoUrl,
        ...(caption ? { caption } : {}),
        ...(options?.parseMode ? { parse_mode: options.parseMode } : {}),
      });
    } catch (error) {
      this.logger.error(
        `Failed to send Telegram photo: ${error instanceof Error ? error.message : error}`,
      );
    }
  }

  async sendPhotoFile(
    file: { buffer: Buffer; filename: string; contentType?: string },
    caption?: string,
    options?: { parseMode?: 'HTML' | 'Markdown' },
  ) {
    try {
      const form = new FormData();
      form.append('chat_id', this.chatId);
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
      await this.callApi('sendPhoto', form);
    } catch (error) {
      this.logger.error(
        `Failed to send Telegram photo file: ${error instanceof Error ? error.message : error}`,
      );
    }
  }
}
