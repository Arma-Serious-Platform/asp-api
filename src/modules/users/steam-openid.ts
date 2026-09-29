export const STEAM_OPENID_ENDPOINT = 'https://steamcommunity.com/openid/login';

export const OPENID_NS = 'http://specs.openid.net/auth/2.0';

const STEAM_CLAIMED_ID_PATTERN =
  /^https:\/\/steamcommunity\.com\/openid\/id\/(\d{17})$/;

const REQUIRED_SIGNED_FIELDS = [
  'op_endpoint',
  'claimed_id',
  'identity',
  'return_to',
  'response_nonce',
];

type QueryValue = string | string[] | undefined;

const single = (value: QueryValue) => (Array.isArray(value) ? value[0] : value);

/**
 * Verifies a Steam OpenID 2.0 positive assertion received on our callback and
 * returns the SteamID64, or null if it is not a genuine Steam login issued for
 * this callback URL and Steam link token.
 */
export async function verifySteamOpenIdResponse(
  query: Record<string, QueryValue>,
  callbackUrl: string,
  accessToken: string,
  fetchFn: typeof fetch = fetch,
): Promise<string | null> {
  const param = (name: string) => single(query[`openid.${name}`]);

  if (
    param('ns') !== OPENID_NS ||
    param('mode') !== 'id_res' ||
    param('op_endpoint') !== STEAM_OPENID_ENDPOINT
  ) {
    return null;
  }

  const claimedId = param('claimed_id');
  const steamId = claimedId?.match(STEAM_CLAIMED_ID_PATTERN)?.[1];
  if (!steamId || param('identity') !== claimedId) {
    return null;
  }

  // The assertion must have been issued for our callback and this link token,
  // otherwise a Steam login made on another site could be replayed here.
  let returnTo: URL;
  try {
    returnTo = new URL(param('return_to') ?? '');
  } catch {
    return null;
  }
  if (
    `${returnTo.origin}${returnTo.pathname}` !== callbackUrl ||
    returnTo.searchParams.get('accessToken') !== accessToken
  ) {
    return null;
  }

  const signedFields = (param('signed') ?? '').split(',');
  if (!REQUIRED_SIGNED_FIELDS.every((field) => signedFields.includes(field))) {
    return null;
  }

  // Ask Steam to confirm the signature (stateless mode, OpenID 2.0 §11.4.2).
  const body = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    const text = single(value);
    if (key.startsWith('openid.') && text !== undefined) {
      body.set(key, text);
    }
  }
  body.set('openid.mode', 'check_authentication');

  const response = await fetchFn(STEAM_OPENID_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    throw new Error(
      `Steam OpenID verification returned HTTP ${response.status}`,
    );
  }

  const text = await response.text();
  return /^is_valid\s*:\s*true\s*$/m.test(text) ? steamId : null;
}
