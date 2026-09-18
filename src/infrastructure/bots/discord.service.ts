import { Injectable, Logger } from '@nestjs/common';

const DISCORD_API = 'https://discord.com/api/v10';

export type DiscordEmbed = {
  title?: string;
  description?: string;
  url?: string;
  color?: number;
  image?: { url: string };
};

@Injectable()
export class DiscordService {
  private readonly logger = new Logger(DiscordService.name);

  private get token() {
    return process.env.DISCORD_BOT_TOKEN?.trim() || '';
  }

  private get channelId() {
    return process.env.DISCORD_CHANNEL_ID?.trim() || '';
  }

  private get isConfigured() {
    return Boolean(this.token && this.channelId);
  }

  private async postMessage(body: Record<string, unknown> | FormData) {
    if (!this.isConfigured) {
      this.logger.debug('Discord skipped: bot token or channel id missing');
      return null;
    }

    const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
    const response = await fetch(`${DISCORD_API}/channels/${this.channelId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bot ${this.token}`,
        ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      },
      body: isFormData ? body : JSON.stringify(body),
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '');
      throw new Error(
        `Discord message failed with status ${response.status}${errorBody ? `: ${errorBody}` : ''}`,
      );
    }

    return response.json().catch(() => null);
  }

  async sendMessage(content: string) {
    try {
      await this.postMessage({ content });
    } catch (error) {
      this.logger.error(
        `Failed to send Discord message: ${error instanceof Error ? error.message : error}`,
      );
    }
  }

  async sendEmbed(embed: DiscordEmbed, content?: string) {
    try {
      await this.postMessage({
        ...(content ? { content } : {}),
        embeds: [embed],
      });
    } catch (error) {
      this.logger.error(
        `Failed to send Discord embed: ${error instanceof Error ? error.message : error}`,
      );
    }
  }

  async sendEmbedWithFile(
    embed: Omit<DiscordEmbed, 'image'> & { imageFilename: string },
    file: { buffer: Buffer; filename: string; contentType?: string },
    content?: string,
  ) {
    try {
      const form = new FormData();
      const payload = {
        ...(content ? { content } : {}),
        embeds: [
          {
            ...embed,
            image: { url: `attachment://${embed.imageFilename}` },
          },
        ],
        attachments: [{ id: 0, filename: file.filename }],
      };
      form.append('payload_json', JSON.stringify(payload));
      form.append(
        'files[0]',
        new Blob([new Uint8Array(file.buffer)], { type: file.contentType || 'image/webp' }),
        file.filename,
      );
      await this.postMessage(form);
    } catch (error) {
      this.logger.error(
        `Failed to send Discord embed with file: ${
          error instanceof Error ? error.message : error
        }`,
      );
    }
  }
}
