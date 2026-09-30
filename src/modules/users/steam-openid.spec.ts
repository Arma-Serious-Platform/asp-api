import {
  OPENID_NS,
  STEAM_OPENID_ENDPOINT,
  verifySteamOpenIdResponse,
} from './steam-openid';

const CALLBACK_URL = 'https://api.example.test/api/users/steam/callback';
const LINK_TOKEN = 'link-token';
const STEAM_ID = '76561197960287930';
const CLAIMED_ID = `https://steamcommunity.com/openid/id/${STEAM_ID}`;

const buildQuery = (overrides: Record<string, string> = {}) => ({
  accessToken: LINK_TOKEN,
  'openid.ns': OPENID_NS,
  'openid.mode': 'id_res',
  'openid.op_endpoint': STEAM_OPENID_ENDPOINT,
  'openid.claimed_id': CLAIMED_ID,
  'openid.identity': CLAIMED_ID,
  'openid.return_to': `${CALLBACK_URL}?accessToken=${LINK_TOKEN}`,
  'openid.response_nonce': '2026-09-30T00:00:00Zabc',
  'openid.assoc_handle': '1234567890',
  'openid.signed':
    'signed,op_endpoint,claimed_id,identity,return_to,response_nonce,assoc_handle',
  'openid.sig': 'c2lnbmF0dXJl',
  ...overrides,
});

const steamReplying = (text: string, status = 200) =>
  jest
    .fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>()
    .mockResolvedValue(new Response(text, { status }));

describe('verifySteamOpenIdResponse', () => {
  it('returns the SteamID64 when Steam confirms the assertion', async () => {
    const fetchFn = steamReplying(
      'ns:http://specs.openid.net/auth/2.0\nis_valid:true\n',
    );

    await expect(
      verifySteamOpenIdResponse(
        buildQuery(),
        CALLBACK_URL,
        LINK_TOKEN,
        fetchFn,
      ),
    ).resolves.toBe(STEAM_ID);

    const [url, init] = fetchFn.mock.calls[0];
    const body = init?.body as URLSearchParams;
    expect(url).toBe(STEAM_OPENID_ENDPOINT);
    expect(init?.method).toBe('POST');
    expect(body.get('openid.mode')).toBe('check_authentication');
    expect(body.get('openid.sig')).toBe('c2lnbmF0dXJl');
    expect(body.get('openid.claimed_id')).toBe(CLAIMED_ID);
    expect(body.has('accessToken')).toBe(false);
  });

  it('returns null when Steam rejects the signature', async () => {
    const fetchFn = steamReplying(
      'ns:http://specs.openid.net/auth/2.0\nis_valid:false\n',
    );

    await expect(
      verifySteamOpenIdResponse(
        buildQuery(),
        CALLBACK_URL,
        LINK_TOKEN,
        fetchFn,
      ),
    ).resolves.toBeNull();
  });

  it('throws when Steam cannot be reached, so the caller can log it', async () => {
    const fetchFn = steamReplying('error', 503);

    await expect(
      verifySteamOpenIdResponse(
        buildQuery(),
        CALLBACK_URL,
        LINK_TOKEN,
        fetchFn,
      ),
    ).rejects.toThrow('HTTP 503');
  });

  it.each([
    [
      'a claimed_id outside steamcommunity.com',
      { 'openid.claimed_id': `https://evil.test/openid/id/${STEAM_ID}` },
    ],
    [
      'a claimed_id that is not a SteamID64',
      { 'openid.claimed_id': 'https://steamcommunity.com/openid/id/123' },
    ],
    [
      'an identity different from claimed_id',
      {
        'openid.identity':
          'https://steamcommunity.com/openid/id/76561197960287931',
      },
    ],
    [
      'a foreign OP endpoint',
      { 'openid.op_endpoint': 'https://evil.test/openid/login' },
    ],
    ['a non-positive mode', { 'openid.mode': 'cancel' }],
    [
      'a return_to on another origin',
      {
        'openid.return_to': `https://evil.test/api/users/steam/callback?accessToken=${LINK_TOKEN}`,
      },
    ],
    [
      'a return_to for another link token',
      { 'openid.return_to': `${CALLBACK_URL}?accessToken=other` },
    ],
    ['a malformed return_to', { 'openid.return_to': 'not a url' }],
    [
      'claimed_id missing from the signed fields',
      {
        'openid.signed': 'signed,op_endpoint,identity,return_to,response_nonce',
      },
    ],
  ])('rejects %s without calling Steam', async (_case, overrides) => {
    const fetchFn = steamReplying('is_valid:true');

    await expect(
      verifySteamOpenIdResponse(
        buildQuery(overrides),
        CALLBACK_URL,
        LINK_TOKEN,
        fetchFn,
      ),
    ).resolves.toBeNull();
    expect(fetchFn).not.toHaveBeenCalled();
  });
});
