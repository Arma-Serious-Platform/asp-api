import { Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { NextFunction, Request, Response } from 'express';
import { OIDC_MOUNT_PATH } from 'src/modules/oidc/oidc.constants';

export const REQUEST_ID_HEADER = 'x-request-id';

export type RequestWithId = Request & {
  requestId?: string;
};

const logger = new Logger('HTTP');

export function requestIdMiddleware(
  req: RequestWithId,
  res: Response,
  next: NextFunction,
): void {
  const incoming = req.header(REQUEST_ID_HEADER)?.trim();
  const requestId = incoming || randomUUID();

  req.requestId = requestId;
  res.setHeader('X-Request-Id', requestId);

  const startedAt = Date.now();

  res.on('finish', () => {
    const fullUrl = req.originalUrl ?? req.url;
    // OpenID Connect requests carry tokens in the query (id_token_hint on
    // logout), which must not end up in logs.
    const url = fullUrl.startsWith(OIDC_MOUNT_PATH)
      ? fullUrl.split('?')[0]
      : fullUrl;
    const durationMs = Date.now() - startedAt;
    logger.log(`${requestId} ${req.method} ${url} ${res.statusCode} ${durationMs}ms`);
  });

  next();
}
