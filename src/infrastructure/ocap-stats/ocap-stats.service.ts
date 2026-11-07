import {
  BadGatewayException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';

const REQUEST_TIMEOUT_MS = 10_000;

@Injectable()
export class OcapStatsService {
  private readonly logger = new Logger(OcapStatsService.name);

  // Config is read per call so a missing stats setup fails this feature only,
  // not the whole API on boot.
  private getConfig() {
    const baseUrl = process.env.OCAP_STATS_API_URL?.trim();
    const apiKey = process.env.OCAP_STATS_API_KEY?.trim();

    if (!baseUrl || !apiKey) {
      throw new ServiceUnavailableException('OCAP stats are not configured');
    }

    return { baseUrl, apiKey };
  }

  async getPlayerBySteamId(steamId: string): Promise<unknown> {
    const { baseUrl, apiKey } = this.getConfig();

    const response = await fetch(
      `${baseUrl}/api/private/v1/players/${encodeURIComponent(steamId)}`,
      {
        headers: { Authorization: `Bearer ${apiKey}` },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      },
    ).catch(() => {
      throw new BadGatewayException('Unable to connect to OCAP stats service');
    });

    if (response.status === 404) {
      throw new NotFoundException('Player stats not found');
    }

    if (!response.ok) {
      this.logger.error(`OCAP stats returned HTTP ${response.status}`);
      throw new BadGatewayException('OCAP stats service returned an error');
    }

    // Steam IDs of other users are admin-only, and any logged-in user sees this.
    const { steamId: _steamId, ...stats } = (await response.json()) as Record<
      string,
      unknown
    >;

    return stats;
  }
}
