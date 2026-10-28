import { INestApplication } from '@nestjs/common';
import {
  Application,
  NextFunction,
  Request,
  Response,
  urlencoded,
} from 'express';
import { FixedWindowRateLimiter } from 'src/shared/utils/rate-limiter';
import { getRequestIp } from 'src/shared/utils/request-ip';
import { OIDC_MOUNT_PATH } from './oidc.constants';
import { OidcProviderService } from './oidc-provider.service';

// Client applications call the token endpoint from their servers, so one IP
// serves many users; the limit only stops client-secret guessing.
const TOKEN_RATE_LIMIT = 600;
const TOKEN_RATE_WINDOW_MS = 60_000;

/**
 * Mounts the provider on the Express app. Call it before enableCors: the
 * provider answers CORS for its own endpoints, per registered client.
 */
export function mountOidcProvider(app: INestApplication) {
  const oidc = app.get(OidcProviderService);
  if (!oidc.enabled) {
    return;
  }

  const limiter = new FixedWindowRateLimiter();

  app.use(
    `${OIDC_MOUNT_PATH}/token`,
    (req: Request, res: Response, next: NextFunction) => {
      if (req.method !== 'POST') {
        return next();
      }

      const result = limiter.hit(
        `oidc-token:${getRequestIp(req) ?? 'unknown'}`,
        TOKEN_RATE_LIMIT,
        TOKEN_RATE_WINDOW_MS,
      );

      if (!result.allowed) {
        res.setHeader('Retry-After', Math.ceil(result.retryAfterMs / 1000));
        res.status(429).json({
          error: 'slow_down',
          error_description: 'Too many requests',
        });
        return;
      }

      next();
    },
  );

  // Libraries send the client secret either in an Authorization header
  // (client_secret_basic, how clients are registered) or in the form body
  // (client_secret_post, the default of passport, Socialite and many PHP
  // libraries). Both are standard, but the provider only accepts the
  // registered one, so a secret in the body is moved into the header. The
  // provider then reads the already parsed body (it warns about that once).
  const express = app.getHttpAdapter().getInstance() as Application;
  const parseForm = urlencoded({ extended: false });
  for (const path of ['/token', '/token/introspection', '/token/revocation']) {
    express.post(`${OIDC_MOUNT_PATH}${path}`, parseForm, moveBodySecretToHeader);
  }

  app.use(OIDC_MOUNT_PATH, oidc.provider.callback());
}

function moveBodySecretToHeader(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  const body = req.body as Record<string, unknown> | undefined;
  const clientId = body?.client_id;
  const clientSecret = body?.client_secret;

  if (
    !req.headers.authorization &&
    typeof clientId === 'string' &&
    typeof clientSecret === 'string'
  ) {
    const credentials = `${encodeURIComponent(clientId)}:${encodeURIComponent(clientSecret)}`;
    req.headers.authorization = `Basic ${Buffer.from(credentials).toString('base64')}`;
    delete body!.client_secret;
  }

  next();
}
