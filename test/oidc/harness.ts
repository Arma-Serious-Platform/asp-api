import { ChildProcess, execSync, spawn } from 'child_process';
import {
  JsonWebKey as NodeJsonWebKey,
  createHash,
  createPublicKey,
  generateKeyPairSync,
  randomBytes,
  randomUUID,
  verify,
} from 'crypto';
import { mkdtempSync } from 'fs';
import { AddressInfo, createServer as createNetServer } from 'net';
import { IncomingMessage, Server, createServer } from 'http';
import { tmpdir } from 'os';
import { join, resolve } from 'path';

const API_ROOT = resolve(__dirname, '..', '..');

export const FRONTEND_URL = 'http://frontend.test';

export function freePort(): Promise<number> {
  return new Promise((resolvePort, reject) => {
    const server = createNetServer();
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address() as AddressInfo;
      server.close(() => resolvePort(port));
    });
    server.on('error', reject);
  });
}

/**
 * Creates a fresh schema for this run in the e2e database and migrates it.
 * Nothing that exists is touched; the caller drops the schema afterwards.
 * Refuses any database whose name does not end in `_e2e`.
 */
export function createTestSchema(databaseUrl: string) {
  const url = new URL(databaseUrl);
  const name = url.pathname.replace(/^\//, '');
  if (!name.endsWith('_e2e')) {
    throw new Error(
      `OIDC_E2E_DATABASE_URL must point to a database named *_e2e, got "${name}"`,
    );
  }

  const schema = `oidc_e2e_${randomBytes(6).toString('hex')}`;
  url.searchParams.set('schema', schema);

  execSync('npx prisma migrate deploy', {
    cwd: API_ROOT,
    env: { ...process.env, DATABASE_URL: url.href },
    stdio: 'pipe',
  });

  return { url: url.href, schema };
}

export type RunningApi = {
  baseUrl: string;
  issuer: string;
  stop: () => void;
  logs: () => string;
};

/**
 * Starts the built API (dist/) with throwaway secrets. It runs from an empty
 * directory so that a developer's .env is not picked up.
 */
export async function startApi(databaseUrl: string): Promise<RunningApi> {
  const port = await freePort();
  const baseUrl = `http://localhost:${port}`;
  const issuer = `${baseUrl}/api/oidc`;
  const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const hex = (bytes: number) => randomBytes(bytes).toString('hex');

  const env: NodeJS.ProcessEnv = {
    ...process.env,
    PORT: String(port),
    DATABASE_URL: databaseUrl,
    JWT_SECRET: hex(32),
    TWO_FACTOR_ENCRYPTION_KEY: hex(32),
    OWNER_EMAIL: 'owner@e2e.test',
    OWNER_NICKNAME: 'E2EOwner',
    OWNER_PASSWORD: hex(16),
    FRONTEND_URL,
    SESSION_COOKIE_SECURE: 'false',
    OIDC_ISSUER: issuer,
    OIDC_JWKS: JSON.stringify({
      keys: [
        {
          ...privateKey.export({ format: 'jwk' }),
          kid: randomUUID(),
          alg: 'RS256',
          use: 'sig',
        },
      ],
    }),
    OIDC_COOKIE_KEYS: `${hex(32)},${hex(32)}`,
    OIDC_CLIENT_SECRET_KEY: hex(32),
    // The test clients' back-channel endpoints listen on 127.0.0.1.
    OIDC_ALLOW_PRIVATE_NETWORK_FETCH: 'true',
  };

  let output = '';
  const child: ChildProcess = spawn(
    process.execPath,
    [join(API_ROOT, 'dist', 'src', 'main.js')],
    { cwd: mkdtempSync(join(tmpdir(), 'asp-oidc-e2e-')), env },
  );
  child.stdout?.on('data', (chunk) => (output += String(chunk)));
  child.stderr?.on('data', (chunk) => (output += String(chunk)));

  const deadline = Date.now() + 90_000;
  for (;;) {
    if (child.exitCode !== null) {
      throw new Error(`API exited during startup:\n${output}`);
    }

    try {
      const res = await fetch(`${issuer}/.well-known/openid-configuration`);
      if (res.ok) {
        break;
      }
    } catch {
      // not listening yet
    }

    if (Date.now() > deadline) {
      child.kill();
      throw new Error(`API did not start in time:\n${output}`);
    }

    await new Promise((done) => setTimeout(done, 250));
  }

  return {
    baseUrl,
    issuer,
    stop: () => child.kill(),
    logs: () => output,
  };
}

/** A browser: keeps cookies and never follows redirects by itself. */
export class Browser {
  readonly cookies = new Map<string, string>();

  async fetch(url: string, init: RequestInit = {}) {
    const headers = new Headers(init.headers);
    if (this.cookies.size) {
      headers.set(
        'cookie',
        [...this.cookies].map(([name, value]) => `${name}=${value}`).join('; '),
      );
    }

    const res = await fetch(url, { ...init, headers, redirect: 'manual' });

    for (const setCookie of res.headers.getSetCookie()) {
      const [pair, ...attributes] = setCookie.split(';');
      const separator = pair.indexOf('=');
      const name = pair.slice(0, separator).trim();
      const value = pair.slice(separator + 1).trim();
      const expired =
        !value ||
        attributes.some((attribute) => {
          const [key, attributeValue = ''] = attribute.trim().split('=');
          return (
            (key.toLowerCase() === 'expires' &&
              new Date(attributeValue) <= new Date()) ||
            (key.toLowerCase() === 'max-age' && Number(attributeValue) <= 0)
          );
        });

      if (expired) {
        this.cookies.delete(name);
      } else {
        this.cookies.set(name, value);
      }
    }

    return res;
  }

  postJson(url: string, body: unknown = {}, headers: Record<string, string> = {}) {
    return this.fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...headers },
      body: JSON.stringify(body),
    });
  }

  postForm(url: string, form: Record<string, string>) {
    return this.fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(form).toString(),
    });
  }
}

export type Followed =
  | { kind: 'external'; location: string }
  | { kind: 'page'; response: Response };

/**
 * A page that posts a form to itself through a script, as the provider's
 * form_post pages do. Returns the form a browser would submit, if any.
 */
function parseAutoSubmitForm(html: string, pageUrl: string) {
  if (!/\.submit\(\)/.test(html)) {
    return undefined;
  }

  const action = /<form[^>]*method="post"[^>]*action="([^"]+)"/i.exec(html)?.[1];
  if (!action) {
    return undefined;
  }

  const fields: Record<string, string> = {};
  for (const [, name, value] of html.matchAll(
    /<input type="hidden" name="([^"]+)" value="([^"]*)"/g,
  )) {
    fields[name] = value.replace(/&amp;/g, '&');
  }

  return { action: new URL(action.replace(/&amp;/g, '&'), pageUrl).href, fields };
}

/**
 * Follows redirects and auto-submitting forms while they stay on the API, as
 * a browser would; stops when they leave it.
 */
export async function followOnApi(
  browser: Browser,
  apiBaseUrl: string,
  url: string,
): Promise<Followed> {
  let next = url;
  let response = await browser.fetch(next);

  for (let hops = 0; hops < 15; hops += 1) {
    const location = response.headers.get('location');

    if (response.status >= 300 && response.status < 400 && location) {
      next = new URL(location, next).href;
      if (!next.startsWith(apiBaseUrl)) {
        return { kind: 'external', location: next };
      }
      response = await browser.fetch(next);
      continue;
    }

    const html = response.status === 200 ? await response.clone().text() : '';
    const form = parseAutoSubmitForm(html, next);
    if (!form || !form.action.startsWith(apiBaseUrl)) {
      return { kind: 'page', response };
    }

    next = form.action;
    response = await browser.postForm(form.action, form.fields);
  }

  throw new Error('Too many redirects');
}

export function createPkce() {
  const verifier = randomBytes(32).toString('base64url');
  const challenge = createHash('sha256').update(verifier).digest('base64url');
  return { verifier, challenge };
}

export type Json = Record<string, any>;

export async function readJson(res: Response): Promise<Json> {
  return (await res.json()) as Json;
}

export function decodeJwt(token: string): { header: Json; payload: Json } {
  const [header, payload] = token.split('.');
  return {
    header: JSON.parse(Buffer.from(header, 'base64url').toString()) as Json,
    payload: JSON.parse(Buffer.from(payload, 'base64url').toString()) as Json,
  };
}

/** Checks an RS256 JWT signature against the provider's published keys. */
export async function verifyJwtSignature(token: string, jwksUri: string) {
  const { keys } = (await (await fetch(jwksUri)).json()) as {
    keys: (NodeJsonWebKey & { kid: string })[];
  };
  const [header, payload, signature] = token.split('.');
  const { kid, alg } = decodeJwt(token).header as { kid: string; alg: string };
  const jwk = keys.find((key) => key.kid === kid);

  if (alg !== 'RS256' || !jwk) {
    return false;
  }

  return verify(
    'RSA-SHA256',
    Buffer.from(`${header}.${payload}`),
    createPublicKey({ key: jwk, format: 'jwk' }),
    Buffer.from(signature, 'base64url'),
  );
}

/** Stands in for a client application's back-channel logout endpoint. */
export async function startLogoutReceiver() {
  const received: { path: string; logoutToken: string }[] = [];
  const server: Server = createServer((req: IncomingMessage, res) => {
    let body = '';
    req.on('data', (chunk) => (body += String(chunk)));
    req.on('end', () => {
      received.push({
        path: req.url ?? '',
        logoutToken: new URLSearchParams(body).get('logout_token') ?? '',
      });
      res.statusCode = 200;
      res.end();
    });
  });

  const port = await freePort();
  await new Promise<void>((done) => server.listen(port, '127.0.0.1', done));

  return {
    origin: `http://127.0.0.1:${port}`,
    received,
    /** Waits for a logout token sent to `path`; resolves with it. */
    async waitFor(path: string, since: number, timeoutMs = 5_000) {
      const deadline = Date.now() + timeoutMs;
      while (Date.now() < deadline) {
        const found = received.slice(since).find((item) => item.path === path);
        if (found) {
          return found.logoutToken;
        }
        await new Promise((done) => setTimeout(done, 50));
      }
      throw new Error(`No back-channel logout arrived at ${path}`);
    },
    close: () => new Promise<void>((done) => server.close(() => done())),
  };
}
