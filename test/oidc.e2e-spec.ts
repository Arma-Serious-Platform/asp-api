/**
 * End-to-end tests of the OpenID Connect provider against the built API
 * (run `nest build` first, or `npm run test:e2e:oidc`). Each run migrates a
 * new schema in a database named *_e2e and drops it at the end:
 *
 *   OIDC_E2E_DATABASE_URL=postgresql://user:pass@localhost:5432/asp_oidc_e2e
 */
import { PrismaClient, UserRole } from '@prisma/client';
import { hash } from 'bcryptjs';
import { createHash, randomBytes } from 'crypto';
import {
  Browser,
  FRONTEND_URL,
  Json,
  RunningApi,
  createPkce,
  createTestSchema,
  decodeJwt,
  followOnApi,
  readJson,
  startApi,
  startLogoutReceiver,
  verifyJwtSignature,
} from './oidc/harness';

const databaseUrl = process.env.OIDC_E2E_DATABASE_URL;
const describeE2e = databaseUrl ? describe : describe.skip;

type TestClient = {
  id: string;
  clientId: string;
  clientSecret: string | null;
  redirectUri: string;
  backchannelPath: string;
  /** Everything the client is allowed to ask for. */
  scope: string;
};

type TokenSet = {
  access_token: string;
  id_token: string;
  refresh_token?: string;
  scope: string;
};

const PASSWORD = 'e2e-Password-1';
/** Browsers send this with every POST the frontend login page makes. */
const fromFrontend = { origin: FRONTEND_URL };

describeE2e('OpenID Connect provider (e2e)', () => {
  jest.setTimeout(60_000);

  let api: RunningApi;
  let prisma: PrismaClient;
  let schema: string;
  let receiver: Awaited<ReturnType<typeof startLogoutReceiver>>;
  let admin: Browser;
  let firstParty: TestClient;
  let thirdParty: TestClient;
  /** A browser app: no secret, PKCE only. */
  let publicClient: TestClient;

  const url = (path: string) => `${api.baseUrl}/api${path}`;

  async function createUser(nickname: string, roles: UserRole[] = ['USER']) {
    return prisma.user.create({
      data: {
        nickname,
        email: `${nickname.toLowerCase()}@e2e.test`,
        password: await hash(PASSWORD, 4),
        isEmailVerified: true,
        roles,
      },
    });
  }

  async function signIn(nickname: string) {
    const browser = new Browser();
    const res = await browser.postJson(url('/auth/session/login'), {
      emailOrNickname: nickname,
      password: PASSWORD,
    });
    expect(res.status).toBe(201);
    return browser;
  }

  async function registerClient(
    name: string,
    body: { allowedScopes: string[]; firstParty?: boolean; confidential?: boolean },
  ): Promise<TestClient> {
    const backchannelPath = `/${name}/backchannel`;
    const redirectUri = `${receiver.origin}/${name}/callback`;
    const res = await admin.postJson(url('/sso/clients'), {
      name,
      redirectUris: [redirectUri],
      postLogoutRedirectUris: [`${receiver.origin}/${name}/logged-out`],
      backchannelLogoutUri: `${receiver.origin}${backchannelPath}`,
      ...body,
    });
    expect(res.status).toBe(201);
    const created = (await res.json()) as {
      id: string;
      clientId: string;
      clientSecret: string | null;
    };

    return {
      ...created,
      redirectUri,
      backchannelPath,
      scope: ['openid', ...body.allowedScopes].join(' '),
    };
  }

  /**
   * Starts an authorization request and follows it as far as the API goes.
   * A parameter passed as '' is left out of the request.
   */
  async function authorize(
    browser: Browser,
    client: TestClient,
    params: Record<string, string> = {},
  ) {
    const pkce = createPkce();
    const state = randomBytes(8).toString('hex');
    const nonce = randomBytes(8).toString('hex');
    const query = new URLSearchParams({
      client_id: client.clientId,
      redirect_uri: client.redirectUri,
      response_type: 'code',
      scope: client.scope,
      state,
      nonce,
      code_challenge: pkce.challenge,
      code_challenge_method: 'S256',
      ...params,
    });
    for (const [key, value] of [...query]) {
      if (value === '') query.delete(key);
    }

    const result = await followOnApi(
      browser,
      api.baseUrl,
      `${url('/oidc/auth')}?${query}`,
    );

    return { result, pkce, state, nonce };
  }

  /** Completes the frontend login page step for an interaction. */
  async function confirmOnFrontend(browser: Browser, location: string) {
    const uid = location.slice(`${FRONTEND_URL}/oauth/`.length);
    const res = await browser.postJson(
      url(`/sso/interactions/${uid}/confirm`),
      {},
      fromFrontend,
    );
    expect(res.status).toBe(200);
    const { redirectTo } = (await res.json()) as { redirectTo: string };
    return followOnApi(browser, api.baseUrl, redirectTo);
  }

  function expectCallback(
    result: Awaited<ReturnType<typeof followOnApi>>,
    client: TestClient,
    state: string,
  ) {
    expect(result.kind).toBe('external');
    const location = new URL((result as { location: string }).location);
    expect(`${location.origin}${location.pathname}`).toBe(client.redirectUri);
    expect(location.searchParams.get('state')).toBe(state);
    expect(location.searchParams.get('error')).toBeNull();
    return location.searchParams.get('code') as string;
  }

  function clientAuth(client: TestClient) {
    return `Basic ${Buffer.from(`${client.clientId}:${client.clientSecret}`).toString('base64')}`;
  }

  async function tokenRequest(client: TestClient, form: Record<string, string>) {
    return fetch(url('/oidc/token'), {
      method: 'POST',
      headers: {
        authorization: clientAuth(client),
        'content-type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams(form).toString(),
    });
  }

  async function exchangeCode(
    client: TestClient,
    code: string,
    verifier: string,
  ): Promise<TokenSet> {
    const res = await tokenRequest(client, {
      grant_type: 'authorization_code',
      code,
      redirect_uri: client.redirectUri,
      code_verifier: verifier,
    });
    expect(res.status).toBe(200);
    return (await res.json()) as TokenSet;
  }

  /**
   * Signs the browser's user in to the client and returns its tokens. A
   * refresh token (offline_access) is only issued with prompt=consent.
   */
  async function signInToClient(browser: Browser, client: TestClient) {
    const { result, pkce, state } = await authorize(
      browser,
      client,
      client.scope.includes('offline_access') ? { prompt: 'consent' } : {},
    );
    let callback = result;
    if (
      result.kind === 'external' &&
      result.location.startsWith(`${FRONTEND_URL}/oauth/`)
    ) {
      callback = await confirmOnFrontend(browser, result.location);
    }
    const code = expectCallback(callback, client, state);
    return exchangeCode(client, code, pkce.verifier);
  }

  async function interactionDetails(browser: Browser, uid: string) {
    return readJson(
      await browser.fetch(url(`/sso/interactions/${uid}/details`)),
    );
  }

  function userinfo(accessToken: string) {
    return fetch(url('/oidc/me'), {
      headers: { authorization: `Bearer ${accessToken}` },
    });
  }

  beforeAll(async () => {
    const database = createTestSchema(databaseUrl as string);
    schema = database.schema;
    prisma = new PrismaClient({ datasourceUrl: database.url });
    receiver = await startLogoutReceiver();
    api = await startApi(database.url);

    await createUser('E2EAdmin', ['SERVER_ADMIN']);
    admin = await signIn('E2EAdmin');

    firstParty = await registerClient('tools', {
      allowedScopes: ['profile', 'email', 'roles', 'squad', 'game', 'offline_access'],
      firstParty: true,
    });
    thirdParty = await registerClient('stats', {
      allowedScopes: ['profile', 'roles', 'game'],
    });
    publicClient = await registerClient('spa', {
      allowedScopes: ['profile'],
      firstParty: true,
      confidential: false,
    });
  }, 180_000);

  afterAll(async () => {
    api?.stop();
    await receiver?.close();
    if (schema) {
      // Only the schema this run created; the name is generated above.
      await prisma.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    }
    await prisma?.$disconnect();
  });

  afterEach(() => {
    const { currentTestName } = expect.getState();
    if (api && process.env.OIDC_E2E_LOGS) {
      console.log(`${currentTestName}\n${api.logs()}`);
    }
  });

  describe('discovery', () => {
    it('publishes RS256 public keys only', async () => {
      const discovery = await readJson(
        await fetch(`${api.issuer}/.well-known/openid-configuration`),
      );
      expect(discovery.issuer).toBe(api.issuer);
      expect(discovery.code_challenge_methods_supported).toEqual(['S256']);
      expect(discovery.response_types_supported).toEqual(['code']);

      const { keys } = (await readJson(
        await fetch(discovery.jwks_uri as string),
      )) as { keys: Json[] };
      expect(keys.length).toBeGreaterThan(0);
      for (const key of keys) {
        expect(key.alg).toBe('RS256');
        expect(key).not.toHaveProperty('d');
        expect(key).not.toHaveProperty('p');
      }
    });
  });

  describe('client administration', () => {
    it('rejects plain-http, wildcard and fragment redirect URIs', async () => {
      for (const redirectUri of [
        'http://app.example.com/callback',
        'https://*.example.com/callback',
        'https://app.example.com/callback#x',
      ]) {
        const res = await admin.postJson(url('/sso/clients'), {
          name: 'bad',
          redirectUris: [redirectUri],
          allowedScopes: ['profile'],
        });
        expect(res.status).toBe(400);
      }
    });

    it('returns the client secret only when it is created', async () => {
      const list = (await (await admin.fetch(url('/sso/clients'))).json()) as Record<
        string,
        unknown
      >[];
      expect(list.length).toBeGreaterThanOrEqual(2);
      for (const client of list) {
        expect(client).not.toHaveProperty('clientSecret');
        expect(client).not.toHaveProperty('clientSecretEncrypted');
        expect(client.confidential).toBe(client.clientId !== publicClient.clientId);
      }
      expect(firstParty.clientSecret).toEqual(expect.any(String));
      expect(publicClient.clientSecret).toBeNull();
    });

    it('refuses admin changes posted from another site', async () => {
      const res = await admin.fetch(url(`/sso/clients/${thirdParty.id}/rotate-secret`), {
        method: 'POST',
        headers: {
          origin: 'https://sibling.example.test',
          'content-type': 'application/x-www-form-urlencoded',
        },
      });
      expect(res.status).toBe(403);
    });

    it('rotates the secret and hands out the discovery URL with it', async () => {
      const res = await admin.postJson(
        url(`/sso/clients/${thirdParty.id}/rotate-secret`),
      );
      expect(res.status).toBe(201);
      const rotated = await readJson(res);
      expect(rotated.discoveryUrl).toBe(
        `${api.issuer}/.well-known/openid-configuration`,
      );
      expect(rotated.clientSecret).not.toBe(thirdParty.clientSecret);

      // The old secret stops working at once; the new one works.
      const oldSecret = thirdParty.clientSecret;
      const probe = (secret: string | null) =>
        fetch(url('/oidc/token/introspection'), {
          method: 'POST',
          headers: {
            authorization: `Basic ${Buffer.from(`${thirdParty.clientId}:${secret}`).toString('base64')}`,
            'content-type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({ token: 'nothing' }).toString(),
        });
      expect((await probe(oldSecret)).status).toBe(401);
      thirdParty.clientSecret = rotated.clientSecret as string;
      expect((await probe(thirdParty.clientSecret)).status).toBe(200);
    });

    it('is closed to everyone but owners and server admins', async () => {
      await createUser('E2EPlain');
      await createUser('E2ETechAdmin', ['TECH_ADMIN']);

      for (const nickname of ['E2EPlain', 'E2ETechAdmin']) {
        const browser = await signIn(nickname);
        expect((await browser.fetch(url('/sso/clients'))).status).toBe(403);
      }
    });
  });

  describe('sign-in', () => {
    let player: Awaited<ReturnType<typeof createUser>>;
    let browser: Browser;

    beforeAll(async () => {
      player = await createUser('E2EPlayer');
      browser = await signIn('E2EPlayer');
    });

    it('signs a VTG user in to a first-party app without any screen', async () => {
      // prompt=consent for a refresh token; first-party apps still see no screen.
      const { result, pkce, state, nonce } = await authorize(browser, firstParty, {
        prompt: 'consent',
      });
      const code = expectCallback(result, firstParty, state);
      const tokens = await exchangeCode(firstParty, code, pkce.verifier);

      expect(tokens.refresh_token).toEqual(expect.any(String));
      expect(await verifyJwtSignature(tokens.id_token, `${api.issuer}/jwks`)).toBe(
        true,
      );

      const { payload } = decodeJwt(tokens.id_token);
      expect(payload).toMatchObject({
        iss: api.issuer,
        aud: firstParty.clientId,
        sub: player.id,
        nonce,
      });
      // Libraries that build the user from the ID token find the profile
      // there too (as of the login; userinfo stays current).
      expect(payload).toMatchObject({
        name: 'E2EPlayer',
        nickname: 'E2EPlayer',
        email: 'e2eplayer@e2e.test',
        asp_roles: ['USER'],
      });

      const claims = await readJson(await userinfo(tokens.access_token));
      expect(claims).toMatchObject({
        sub: player.id,
        nickname: 'E2EPlayer',
        email: 'e2eplayer@e2e.test',
        email_verified: true,
        asp_roles: ['USER'],
        game_access: true,
        banned_until: null,
        squad: null,
      });
    });

    it('serves nickname, email and roles from the database on every call', async () => {
      const tokens = await signInToClient(browser, firstParty);

      await prisma.user.update({
        where: { id: player.id },
        data: { nickname: 'E2ERenamed', email: 'renamed@e2e.test' },
      });
      const roleChange = await admin.fetch(url('/users/change-role'), {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id: player.id, roles: ['USER', 'GAME_ADMIN'] }),
      });
      expect(roleChange.status).toBe(200);

      const claims = await readJson(await userinfo(tokens.access_token));
      expect(claims).toMatchObject({
        sub: player.id,
        nickname: 'E2ERenamed',
        email: 'renamed@e2e.test',
        asp_roles: ['USER', 'GAME_ADMIN'],
      });
    });

    it('only releases the claims of the scopes a client is allowed', async () => {
      const tokens = await signInToClient(browser, thirdParty);
      expect(tokens.scope.split(' ').sort()).toEqual(
        ['game', 'openid', 'profile', 'roles'].sort(),
      );
      expect(tokens.refresh_token).toBeUndefined();

      const claims = await readJson(await userinfo(tokens.access_token));
      expect(claims).toHaveProperty('nickname');
      expect(claims).toHaveProperty('asp_roles');
      expect(claims).not.toHaveProperty('email');
      expect(claims).not.toHaveProperty('squad');
    });

    it('leaves out scopes the client is not registered for', async () => {
      // Libraries often ask for `openid profile email` by default.
      const { result, pkce, state } = await authorize(browser, thirdParty, {
        scope: 'openid profile email',
      });
      const code = expectCallback(result, thirdParty, state);
      const tokens = await exchangeCode(thirdParty, code, pkce.verifier);
      expect(tokens.scope.split(' ').sort()).toEqual(['openid', 'profile']);

      const claims = await readJson(await userinfo(tokens.access_token));
      expect(claims).toHaveProperty('nickname');
      expect(claims).not.toHaveProperty('email');
    });

    it('requires PKCE from browser apps', async () => {
      const { result } = await authorize(browser, publicClient, {
        code_challenge: '',
        code_challenge_method: '',
      });
      expect(result.kind).toBe('external');
      const location = new URL((result as { location: string }).location);
      expect(location.searchParams.get('error')).toBe('invalid_request');
    });

    it('signs a browser app in with PKCE and no secret, with CORS', async () => {
      const { result, pkce, state } = await authorize(browser, publicClient);
      const code = expectCallback(result, publicClient, state);

      const preflight = await fetch(url('/oidc/token'), {
        method: 'OPTIONS',
        headers: {
          origin: receiver.origin,
          'access-control-request-method': 'POST',
          'access-control-request-headers': 'content-type',
        },
      });
      expect(preflight.headers.get('access-control-allow-origin')).toBe(
        receiver.origin,
      );

      const res = await fetch(url('/oidc/token'), {
        method: 'POST',
        headers: {
          origin: receiver.origin,
          'content-type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          client_id: publicClient.clientId,
          code,
          redirect_uri: publicClient.redirectUri,
          code_verifier: pkce.verifier,
        }).toString(),
      });
      expect(res.status).toBe(200);
      expect(res.headers.get('access-control-allow-origin')).toBe(receiver.origin);
    });

    it('lets server apps skip PKCE and send the secret in the body', async () => {
      const { result, state } = await authorize(browser, firstParty, {
        code_challenge: '',
        code_challenge_method: '',
      });
      const code = expectCallback(result, firstParty, state);

      // client_secret_post instead of the registered client_secret_basic.
      const res = await fetch(url('/oidc/token'), {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: firstParty.redirectUri,
          client_id: firstParty.clientId,
          client_secret: firstParty.clientSecret as string,
        }).toString(),
      });
      expect(res.status).toBe(200);
      const tokens = (await readJson(res)) as TokenSet;
      expect((await userinfo(tokens.access_token)).status).toBe(200);

      const wrong = await fetch(url('/oidc/token/introspection'), {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          token: tokens.access_token,
          client_id: firstParty.clientId,
          client_secret: 'not-the-secret',
        }).toString(),
      });
      expect(wrong.status).toBe(401);
    });

    it('accepts consent only from the VTG frontend', async () => {
      await createUser('E2ECsrf');
      const victim = await signIn('E2ECsrf');
      const { result } = await authorize(victim, thirdParty);
      const uid = (result as { location: string }).location.slice(
        `${FRONTEND_URL}/oauth/`.length,
      );

      const attempts: Record<string, string>[] = [
        {},
        { origin: 'https://sibling.example.test' },
      ];
      for (const headers of attempts) {
        const res = await victim.postJson(
          url(`/sso/interactions/${uid}/confirm`),
          {},
          headers,
        );
        expect(res.status).toBe(403);
      }
      expect(await readJson(await victim.fetch(url('/sso/connected-apps')))).toEqual(
        [],
      );
    });

    it('never redirects to an unregistered redirect_uri', async () => {
      const { result } = await authorize(browser, firstParty, {
        redirect_uri: 'https://attacker.example/callback',
      });
      expect(result.kind).toBe('page');
      const { response } = result as { response: Response };
      expect(response.status).toBe(400);
      expect(response.headers.get('location')).toBeNull();
      expect(await response.text()).toContain('Не вдалося обробити запит на вхід');
    });

    it('sends a signed-out user to the login page and continues after login', async () => {
      const fresh = new Browser();
      const { result, pkce, state } = await authorize(fresh, firstParty);
      expect(result.kind).toBe('external');
      const location = (result as { location: string }).location;
      expect(location.startsWith(`${FRONTEND_URL}/oauth/`)).toBe(true);
      const uid = location.slice(`${FRONTEND_URL}/oauth/`.length);

      const before = await interactionDetails(fresh, uid);
      expect(before).toMatchObject({
        step: 'login',
        user: null,
        client: { clientId: firstParty.clientId, name: 'tools', firstParty: true },
      });

      // Confirming without a VTG session is refused.
      expect(
        (
          await fresh.postJson(
            url(`/sso/interactions/${uid}/confirm`),
            {},
            fromFrontend,
          )
        ).status,
      ).toBe(401);

      await fresh.postJson(url('/auth/session/login'), {
        emailOrNickname: 'E2EAdmin',
        password: PASSWORD,
      });
      const after = await interactionDetails(fresh, uid);
      expect(after.step).toBe('continue');

      const callback = await confirmOnFrontend(fresh, location);
      const code = expectCallback(callback, firstParty, state);
      const tokens = await exchangeCode(firstParty, code, pkce.verifier);
      expect(decodeJwt(tokens.id_token).payload.sub).not.toBe(player.id);
    });

    it('asks consent for a third-party app once and remembers it', async () => {
      await createUser('E2EConsent');
      const first = await signIn('E2EConsent');

      const { result } = await authorize(first, thirdParty);
      const location = (result as { location: string }).location;
      const uid = location.slice(`${FRONTEND_URL}/oauth/`.length);
      const details = await interactionDetails(first, uid);
      expect(details.step).toBe('consent');
      expect(details.scopes.sort()).toEqual(['game', 'profile', 'roles']);
      expect(details.client).toMatchObject({
        firstParty: false,
        domain: new URL(receiver.origin).host,
      });
      await confirmOnFrontend(first, location);

      // Another device, another VTG session: no consent screen this time.
      const second = await signIn('E2EConsent');
      const again = await authorize(second, thirdParty);
      expectCallback(again.result, thirdParty, again.state);

      const apps = await readJson(await second.fetch(url('/sso/connected-apps')));
      expect(apps).toEqual([
        expect.objectContaining({
          clientId: thirdParty.clientId,
          firstParty: false,
          scopes: expect.arrayContaining(['profile', 'roles', 'game']) as unknown,
        }),
      ]);
    });

    it('asks consent before a third-party app learns who the user is', async () => {
      await createUser('E2EOpenidOnly');
      const visitor = await signIn('E2EOpenidOnly');

      // Silent identification attempt: openid alone, no screen allowed.
      const silent = await authorize(visitor, thirdParty, {
        scope: 'openid',
        prompt: 'none',
      });
      const silentUrl = new URL((silent.result as { location: string }).location);
      expect(silentUrl.searchParams.get('code')).toBeNull();
      expect(silentUrl.searchParams.get('error')).toMatch(/_required$/);

      const { result } = await authorize(visitor, thirdParty, { scope: 'openid' });
      const location = (result as { location: string }).location;
      const uid = location.slice(`${FRONTEND_URL}/oauth/`.length);
      const details = await interactionDetails(visitor, uid);
      expect(details).toMatchObject({ step: 'consent', scopes: [] });
    });

    it('does not keep the VTG session alive through an app', async () => {
      const user = await createUser('E2EIdle');
      const browser = await signIn('E2EIdle');
      const tokens = await signInToClient(browser, firstParty);

      const sessionId = decodeURIComponent(browser.cookies.get('sessionId') as string);
      const idleSince = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
      await prisma.userSession.update({
        where: { id: sessionId },
        data: { lastActiveAt: idleSince, expiresAt },
      });

      expect((await userinfo(tokens.access_token)).status).toBe(200);

      const session = await prisma.userSession.findUniqueOrThrow({
        where: { id: sessionId },
      });
      expect(session.userId).toBe(user.id);
      expect(session.lastActiveAt).toEqual(idleSince);
      expect(session.expiresAt).toEqual(expiresAt);
    });

    it('asks consent again when a third-party app sends prompt=consent', async () => {
      const returning = await signIn('E2EConsent');
      const { result } = await authorize(returning, thirdParty, {
        prompt: 'consent',
      });
      const location = (result as { location: string }).location;
      const uid = location.slice(`${FRONTEND_URL}/oauth/`.length);
      const details = await interactionDetails(returning, uid);
      expect(details.step).toBe('consent');
    });

    it('switches accounts only once the other account has signed in', async () => {
      const first = await createUser('E2ESwitchFrom');
      const second = await createUser('E2ESwitchTo');
      const browser = await signIn('E2ESwitchFrom');
      const firstTokens = await signInToClient(browser, firstParty);
      const firstSessionCookie = browser.cookies.get('sessionId') as string;

      const { result, state, pkce } = await authorize(browser, thirdParty);
      const location = (result as { location: string }).location;
      const uid = location.slice(`${FRONTEND_URL}/oauth/`.length);
      expect((await interactionDetails(browser, uid)).user).toMatchObject({
        id: first.id,
      });
      const since = receiver.received.length;

      // Logging in as someone else in this browser replaces the session.
      const login = await browser.postJson(url('/auth/session/login'), {
        emailOrNickname: 'E2ESwitchTo',
        password: PASSWORD,
      });
      expect(login.status).toBe(201);

      const stale = new Browser();
      stale.cookies.set('sessionId', firstSessionCookie);
      expect((await stale.fetch(url('/auth/session/me'))).status).toBe(401);
      await receiver.waitFor(firstParty.backchannelPath, since);
      expect((await userinfo(firstTokens.access_token)).status).toBe(401);

      // The same login request now continues as the second account.
      expect((await interactionDetails(browser, uid)).user).toMatchObject({
        id: second.id,
      });
      const callback = await confirmOnFrontend(browser, location);
      const code = expectCallback(callback, thirdParty, state);
      const tokens = await exchangeCode(thirdParty, code, pkce.verifier);
      expect(decodeJwt(tokens.id_token).payload.sub).toBe(second.id);
    });

    it('returns access_denied to the client when the user cancels', async () => {
      const cancelling = await signIn('E2EPlain');
      const { result, state } = await authorize(cancelling, thirdParty);
      const location = (result as { location: string }).location;
      const uid = location.slice(`${FRONTEND_URL}/oauth/`.length);

      const res = await cancelling.postJson(
        url(`/sso/interactions/${uid}/abort`),
        {},
        fromFrontend,
      );
      const { redirectTo } = (await readJson(res)) as { redirectTo: string };
      const callback = await followOnApi(cancelling, api.baseUrl, redirectTo);
      const callbackUrl = new URL((callback as { location: string }).location);
      expect(callbackUrl.searchParams.get('error')).toBe('access_denied');
      expect(callbackUrl.searchParams.get('state')).toBe(state);
    });
  });

  describe('account restrictions', () => {
    it('reports a temporary ban as lost game access without blocking sign-in', async () => {
      const user = await createUser('E2ETempBan');
      const browser = await signIn('E2ETempBan');
      const tokens = await signInToClient(browser, firstParty);

      const bannedUntil = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      const ban = await admin.postJson(
        url(`/users/ban/${user.id}/${encodeURIComponent(bannedUntil)}`),
        { reason: 'e2e' },
      );
      expect(ban.status).toBe(201);

      const claims = await readJson(await userinfo(tokens.access_token));
      expect(claims.game_access).toBe(false);
      expect(new Date(claims.banned_until as string).toISOString()).toBe(
        bannedUntil,
      );

      // Signing in still works; the consent page can show the ban.
      await signInToClient(browser, firstParty);
      const { result } = await authorize(browser, thirdParty);
      const location = (result as { location: string }).location;
      const uid = location.slice(`${FRONTEND_URL}/oauth/`.length);
      const details = await interactionDetails(browser, uid);
      expect(details.step).toBe('consent');
      expect(details.user).toMatchObject({
        id: user.id,
        accountState: 'temporarily_banned',
      });
      expect(new Date(details.user.bannedUntil as string).toISOString()).toBe(
        bannedUntil,
      );
    });

    it('cuts off every app when the account is permanently banned', async () => {
      const user = await createUser('E2EPermaBan');
      const browser = await signIn('E2EPermaBan');
      const tokens = await signInToClient(browser, firstParty);
      const since = receiver.received.length;

      const ban = await admin.postJson(url(`/users/ban/${user.id}/permanent`), {
        reason: 'e2e',
      });
      expect(ban.status).toBe(201);

      const logoutToken = await receiver.waitFor(firstParty.backchannelPath, since);
      expect(await verifyJwtSignature(logoutToken, `${api.issuer}/jwks`)).toBe(true);
      expect(decodeJwt(logoutToken).payload).toMatchObject({
        sub: user.id,
        aud: firstParty.clientId,
        events: { 'http://schemas.openid.net/event/backchannel-logout': {} },
      });

      expect((await userinfo(tokens.access_token)).status).toBe(401);
      const refresh = await tokenRequest(firstParty, {
        grant_type: 'refresh_token',
        refresh_token: tokens.refresh_token as string,
      });
      expect(refresh.status).toBe(400);
      expect((await readJson(refresh)).error).toBe('invalid_grant');

      const login = await new Browser().postJson(url('/auth/session/login'), {
        emailOrNickname: 'E2EPermaBan',
        password: PASSWORD,
      });
      expect(login.status).toBe(401);
    });
  });

  describe('revocation', () => {
    it('ends the app session when the VTG session logs out', async () => {
      await createUser('E2ELogout');
      const browser = await signIn('E2ELogout');
      const tokens = await signInToClient(browser, firstParty);
      const since = receiver.received.length;

      const introspect = (token: string) =>
        fetch(url('/oidc/token/introspection'), {
          method: 'POST',
          headers: {
            authorization: clientAuth(firstParty),
            'content-type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({ token }).toString(),
        }).then(readJson);

      expect((await introspect(tokens.access_token)).active).toBe(true);

      await browser.postJson(url('/auth/session/logout'));

      await receiver.waitFor(firstParty.backchannelPath, since);
      expect((await introspect(tokens.access_token)).active).toBe(false);
      expect((await userinfo(tokens.access_token)).status).toBe(401);
      const refresh = await tokenRequest(firstParty, {
        grant_type: 'refresh_token',
        refresh_token: tokens.refresh_token as string,
      });
      expect((await readJson(refresh)).error).toBe('invalid_grant');
    });

    it('revoking one device from the sessions list keeps the others', async () => {
      await createUser('E2EDevices');
      const phone = await signIn('E2EDevices');
      const laptop = await signIn('E2EDevices');
      const phoneTokens = await signInToClient(phone, firstParty);
      const laptopTokens = await signInToClient(laptop, firstParty);

      const phoneSessionId = phone.cookies.get('sessionId') as string;
      const publicId = createHash('sha256')
        .update(decodeURIComponent(phoneSessionId))
        .digest('base64url');
      const revoke = await laptop.fetch(url(`/auth/session/${publicId}`), {
        method: 'DELETE',
      });
      expect(revoke.status).toBe(200);

      expect((await userinfo(phoneTokens.access_token)).status).toBe(401);
      expect((await userinfo(laptopTokens.access_token)).status).toBe(200);
    });

    it('lets a user disconnect an app', async () => {
      await createUser('E2EDisconnect');
      const browser = await signIn('E2EDisconnect');
      const tokens = await signInToClient(browser, thirdParty);
      const since = receiver.received.length;

      const res = await browser.fetch(
        url(`/sso/connected-apps/${thirdParty.clientId}`),
        { method: 'DELETE' },
      );
      expect(res.status).toBe(200);

      await receiver.waitFor(thirdParty.backchannelPath, since);
      expect((await userinfo(tokens.access_token)).status).toBe(401);
      expect(
        await readJson(await browser.fetch(url('/sso/connected-apps'))),
      ).toEqual([]);

      // Consent is asked again on the next sign-in.
      const { result } = await authorize(browser, thirdParty);
      const location = (result as { location: string }).location;
      const uid = location.slice(`${FRONTEND_URL}/oauth/`.length);
      const details = await interactionDetails(browser, uid);
      expect(details.step).toBe('consent');
    });

    it('keeps the provider session from outliving a VTG logout', async () => {
      const first = await createUser('E2ESwitchA');
      const second = await createUser('E2ESwitchB');
      const browser = await signIn('E2ESwitchA');
      const firstTokens = await signInToClient(browser, firstParty);
      expect(decodeJwt(firstTokens.id_token).payload.sub).toBe(first.id);

      await browser.postJson(url('/auth/session/logout'));
      await browser.postJson(url('/auth/session/login'), {
        emailOrNickname: 'E2ESwitchB',
        password: PASSWORD,
      });

      const secondTokens = await signInToClient(browser, firstParty);
      expect(decodeJwt(secondTokens.id_token).payload.sub).toBe(second.id);
      // Signing in as B ends the provider session of A, never B's VTG session.
      expect((await browser.fetch(url('/auth/session/me'))).status).toBe(200);
    });

    it('stops sign-ins and revokes tokens of a disabled client', async () => {
      await createUser('E2EDisabled');
      const browser = await signIn('E2EDisabled');
      const disposable = await registerClient('disposable', {
        allowedScopes: ['profile'],
        firstParty: true,
      });
      const tokens = await signInToClient(browser, disposable);
      const since = receiver.received.length;

      const res = await admin.fetch(url(`/sso/clients/${disposable.id}`), {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ disabled: true }),
      });
      expect(res.status).toBe(200);

      // The app is told to end its sessions, not only cut off.
      await receiver.waitFor(disposable.backchannelPath, since);
      expect((await userinfo(tokens.access_token)).status).toBe(401);
      const { result } = await authorize(browser, disposable);
      expect(result.kind).toBe('page');
      expect((result as { response: Response }).response.status).toBe(400);
    });
  });

  describe('logout requested by an app', () => {
    async function startLogout(
      browser: Browser,
      client: TestClient,
      tokens: TokenSet,
    ) {
      const query = new URLSearchParams({
        id_token_hint: tokens.id_token,
        post_logout_redirect_uri: `${receiver.origin}${client.backchannelPath.replace('/backchannel', '/logged-out')}`,
        state: 'bye',
      });
      const res = await browser.fetch(`${url('/oidc/session/end')}?${query}`);
      expect(res.status).toBe(200);
      const html = await res.text();
      const action = /action="([^"]+)"/.exec(html)?.[1] as string;
      const xsrf = /name="xsrf" value="([^"]+)"/.exec(html)?.[1] as string;
      return { html, action: action.replace(/&amp;/g, '&'), xsrf };
    }

    it('logs a first-party app out of VTG and every app without asking', async () => {
      await createUser('E2ERpLogout');
      const browser = await signIn('E2ERpLogout');
      const tokens = await signInToClient(browser, firstParty);
      const otherTokens = await signInToClient(browser, thirdParty);

      const { html, action, xsrf } = await startLogout(browser, firstParty, tokens);
      expect(html).toContain('name="logout" value="yes"');
      expect(html).toContain('submit()');

      const res = await browser.postForm(action, { xsrf, logout: 'yes' });
      expect(res.status).toBe(303);
      const location = new URL(res.headers.get('location') as string);
      expect(location.pathname).toBe('/tools/logged-out');
      expect(location.searchParams.get('state')).toBe('bye');

      expect((await browser.fetch(url('/auth/session/me'))).status).toBe(401);
      expect((await userinfo(tokens.access_token)).status).toBe(401);
      expect((await userinfo(otherTokens.access_token)).status).toBe(401);
    });

    it('lets a third-party app sign the user out of that app only', async () => {
      await createUser('E2EAppOnly');
      const browser = await signIn('E2EAppOnly');
      const tokens = await signInToClient(browser, thirdParty);
      const firstPartyTokens = await signInToClient(browser, firstParty);

      const { html, action, xsrf } = await startLogout(browser, thirdParty, tokens);
      expect(html).toContain('Вийти лише з stats');
      expect(html).toContain('Вийти з VTG і всіх додатків');

      const res = await browser.postForm(action, { xsrf });
      expect(res.status).toBe(303);

      expect((await browser.fetch(url('/auth/session/me'))).status).toBe(200);
      expect((await userinfo(tokens.access_token)).status).toBe(401);
      expect((await userinfo(firstPartyTokens.access_token)).status).toBe(200);
    });
  });
});
