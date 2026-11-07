import {
  BadGatewayException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { OcapStatsService } from './ocap-stats.service';

const STEAM_ID = '76561197960287930';

describe('OcapStatsService', () => {
  const originalEnv = { ...process.env };
  const fetchMock = jest.fn();
  let service: OcapStatsService;

  beforeEach(() => {
    process.env.OCAP_STATS_API_URL = 'https://stats.example.test';
    process.env.OCAP_STATS_API_KEY = 'secret-token';
    fetchMock.mockReset();
    global.fetch = fetchMock;
    service = new OcapStatsService();
    jest.spyOn(service['logger'], 'error').mockImplementation();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('requests the private endpoint with the bearer token', async () => {
    const stats = { player: { name: 'Merc' } };
    fetchMock.mockResolvedValue(new Response(JSON.stringify(stats)));

    await expect(service.getPlayerBySteamId(STEAM_ID)).resolves.toEqual(stats);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(
      `https://stats.example.test/api/private/v1/players/${STEAM_ID}`,
    );
    expect(init.headers).toEqual({ Authorization: 'Bearer secret-token' });
  });

  it('removes the Steam ID from the response', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({ steamId: STEAM_ID, player: { name: 'Merc' } }),
      ),
    );

    await expect(service.getPlayerBySteamId(STEAM_ID)).resolves.toEqual({
      player: { name: 'Merc' },
    });
  });

  it('maps an unknown player to 404', async () => {
    fetchMock.mockResolvedValue(new Response('{}', { status: 404 }));

    await expect(service.getPlayerBySteamId(STEAM_ID)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it.each([401, 500])('maps upstream HTTP %i to 502', async (status) => {
    fetchMock.mockResolvedValue(new Response('{}', { status }));

    await expect(service.getPlayerBySteamId(STEAM_ID)).rejects.toBeInstanceOf(
      BadGatewayException,
    );
  });

  it('maps a network failure to 502', async () => {
    fetchMock.mockRejectedValue(new Error('connect ECONNREFUSED'));

    await expect(service.getPlayerBySteamId(STEAM_ID)).rejects.toBeInstanceOf(
      BadGatewayException,
    );
  });

  it('fails only at call time when not configured', async () => {
    delete process.env.OCAP_STATS_API_KEY;

    await expect(service.getPlayerBySteamId(STEAM_ID)).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
