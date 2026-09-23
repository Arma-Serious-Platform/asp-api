import { Injectable, Logger } from '@nestjs/common';

const DISCORD_API = 'https://discord.com/api/v10';
const EVERYONE_MENTION = '@everyone';
const WEEKEND_MENTION = '@Гравець @КЗ';

export type DiscordChannelCreds = {
  token: string;
  channelId: string;
};

export type DiscordEmbed = {
  title?: string;
  description?: string;
  url?: string;
  color?: number;
  image?: { url: string };
};

export type DiscordSendOptions = {
  /** Prefix before message content. Defaults to @everyone. Pass null to skip. */
  mention?: string | null;
};

@Injectable()
export class DiscordService {
  private readonly logger = new Logger(DiscordService.name);

  static readonly EVERYONE_MENTION = EVERYONE_MENTION;
  static readonly WEEKEND_MENTION = WEEKEND_MENTION;

  private withMentionPrefix(content?: string, mention: string | null = EVERYONE_MENTION) {
    const text = content?.trim() ?? '';
    if (mention === null || mention === '') {
      return text;
    }
    if (!text) {
      return mention;
    }
    if (text.startsWith(mention)) {
      return text;
    }
    return `${mention}\n${text}`;
  }

  private allowedMentionsFor(mention: string | null) {
    if (mention === EVERYONE_MENTION) {
      return { parse: ['everyone'] };
    }
    // Role/user name prefixes (e.g. @Гравець) are plain text; roles/users parse
    // covers real <@&id>/<@id> forms if present in content.
    return { parse: ['roles', 'users'] };
  }

  private async postMessage(creds: DiscordChannelCreds, body: Record<string, unknown> | FormData) {
    const token = creds.token?.trim();
    const channelId = creds.channelId?.trim();
    if (!token || !channelId) {
      this.logger.debug('Discord skipped: token or channel id missing');
      return null;
    }

    const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
    const response = await fetch(`${DISCORD_API}/channels/${channelId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bot ${token}`,
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

  async sendMessage(
    creds: DiscordChannelCreds,
    content: string,
    options?: DiscordSendOptions,
  ) {
    try {
      const mention = options?.mention === undefined ? EVERYONE_MENTION : options.mention;
      await this.postMessage(creds, {
        content: this.withMentionPrefix(content, mention),
        allowed_mentions: this.allowedMentionsFor(mention),
      });
    } catch (error) {
      this.logger.error(
        `Failed to send Discord message: ${error instanceof Error ? error.message : error}`,
      );
    }
  }

  async sendEmbed(
    creds: DiscordChannelCreds,
    embed: DiscordEmbed,
    content?: string,
    options?: DiscordSendOptions,
  ) {
    try {
      const mention = options?.mention === undefined ? EVERYONE_MENTION : options.mention;
      await this.postMessage(creds, {
        content: this.withMentionPrefix(content, mention),
        allowed_mentions: this.allowedMentionsFor(mention),
        embeds: [embed],
      });
    } catch (error) {
      this.logger.error(
        `Failed to send Discord embed: ${error instanceof Error ? error.message : error}`,
      );
    }
  }

  async sendEmbedWithFile(
    creds: DiscordChannelCreds,
    embed: Omit<DiscordEmbed, 'image'> & { imageFilename: string },
    file: { buffer: Buffer; filename: string; contentType?: string },
    content?: string,
    options?: DiscordSendOptions,
  ) {
    try {
      const mention = options?.mention === undefined ? EVERYONE_MENTION : options.mention;
      const form = new FormData();
      const payload = {
        content: this.withMentionPrefix(content, mention),
        allowed_mentions: this.allowedMentionsFor(mention),
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
      await this.postMessage(creds, form);
    } catch (error) {
      this.logger.error(
        `Failed to send Discord embed with file: ${
          error instanceof Error ? error.message : error
        }`,
      );
    }
  }
}
