import { Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { NextFunction, Request, Response } from 'express';

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
    const url = req.originalUrl ?? req.url;
    const durationMs = Date.now() - startedAt;
    logger.log(`${requestId} ${req.method} ${url} ${res.statusCode} ${durationMs}ms`);
  });

  next();
}
