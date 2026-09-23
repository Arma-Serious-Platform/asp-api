import { Injectable, Logger } from '@nestjs/common';

const DISCORD_API = 'https://discord.com/api/v10';
const EVERYONE_MENTION = '@everyone';
const WEEKEND_ROLE_NAMES = ['Гравець', 'КЗ'] as const;

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
  /**
   * Prefix before message content. Defaults to @everyone.
   * Pass null to skip. Ignored when `mentionRoleNames` is set.
   */
  mention?: string | null;
  /** Resolve guild roles by name to real Discord <@&id> mentions. */
  mentionRoleNames?: string[];
};

@Injectable()
export class DiscordService {
  private readonly logger = new Logger(DiscordService.name);

  static readonly EVERYONE_MENTION = EVERYONE_MENTION;
  static readonly WEEKEND_ROLE_NAMES = [...WEEKEND_ROLE_NAMES];

  private withMentionPrefix(content: string | undefined, mention: string) {
    const text = content?.trim() ?? '';
    if (!text) {
      return mention;
    }
    if (text.startsWith(mention)) {
      return text;
    }
    // Blank line between mention ping and message body
    return `${mention}\n\n${text}`;
  }

  private async fetchJson<T>(
    token: string,
    path: string,
  ): Promise<T | null> {
    const response = await fetch(`${DISCORD_API}${path}`, {
      headers: { Authorization: `Bot ${token}` },
    });
    if (!response.ok) {
      const errorBody = await response.text().catch(() => '');
      this.logger.warn(
        `Discord GET ${path} failed (${response.status})${errorBody ? `: ${errorBody}` : ''}`,
      );
      return null;
    }
    return (await response.json()) as T;
  }

  private async resolveRoleMentions(
    creds: DiscordChannelCreds,
    roleNames: string[],
  ): Promise<{ mention: string; roleIds: string[] } | null> {
    const token = creds.token?.trim();
    const channelId = creds.channelId?.trim();
    if (!token || !channelId || roleNames.length === 0) {
      return null;
    }

    const channel = await this.fetchJson<{ guild_id?: string }>(
      token,
      `/channels/${channelId}`,
    );
    const guildId = channel?.guild_id;
    if (!guildId) {
      this.logger.warn(`Discord channel ${channelId} has no guild_id`);
      return null;
    }

    const roles = await this.fetchJson<Array<{ id: string; name: string }>>(
      token,
      `/guilds/${guildId}/roles`,
    );
    if (!roles?.length) {
      return null;
    }

    const roleIds: string[] = [];
    const parts: string[] = [];

    for (const name of roleNames) {
      const role = roles.find((item) => item.name === name);
      if (!role) {
        this.logger.warn(`Discord role "${name}" not found in guild ${guildId}`);
        continue;
      }
      roleIds.push(role.id);
      parts.push(`<@&${role.id}>`);
    }

    if (!parts.length) {
      return null;
    }

    return { mention: parts.join(' '), roleIds };
  }

  private async buildMessageContent(
    creds: DiscordChannelCreds,
    content: string | undefined,
    options?: DiscordSendOptions,
  ): Promise<{ content: string; allowed_mentions: Record<string, unknown> }> {
    if (options?.mentionRoleNames?.length) {
      const resolved = await this.resolveRoleMentions(creds, options.mentionRoleNames);
      if (resolved) {
        return {
          content: this.withMentionPrefix(content, resolved.mention),
          allowed_mentions: { roles: resolved.roleIds },
        };
      }
      this.logger.warn(
        `Falling back to plain-text role names: ${options.mentionRoleNames.join(', ')}`,
      );
      const fallback = options.mentionRoleNames.map((name) => `@${name}`).join(' ');
      return {
        content: this.withMentionPrefix(content, fallback),
        allowed_mentions: { parse: [] },
      };
    }

    const mention = options?.mention === undefined ? EVERYONE_MENTION : options.mention;
    if (mention === null || mention === '') {
      return {
        content: content?.trim() ?? '',
        allowed_mentions: { parse: [] },
      };
    }

    return {
      content: this.withMentionPrefix(content, mention),
      allowed_mentions:
        mention === EVERYONE_MENTION ? { parse: ['everyone'] } : { parse: ['roles', 'users'] },
    };
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
      const message = await this.buildMessageContent(creds, content, options);
      await this.postMessage(creds, message);
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
      const message = await this.buildMessageContent(creds, content, options);
      await this.postMessage(creds, {
        ...message,
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
      const message = await this.buildMessageContent(creds, content, options);
      const form = new FormData();
      const payload = {
        ...message,
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
