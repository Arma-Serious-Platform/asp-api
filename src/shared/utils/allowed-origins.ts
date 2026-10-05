import type { IncomingMessage } from 'http';

type OriginCallback = (err: Error | null, allow?: boolean) => void;

// Read on every request: gateway decorators are evaluated at import time,
// before ConfigModule has loaded .env.
export function getAllowedOrigins(): string[] {
  return (process.env.FRONTEND_URL ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

/**
 * Browsers always send Origin on cross-origin and WebSocket requests, so only
 * listed origins are accepted. Requests without Origin come from non-browser
 * clients (bots, server-side rendering) and are not subject to CORS.
 * Fails closed: with FRONTEND_URL unset no browser origin is allowed.
 */
export function isAllowedOrigin(origin: string | undefined): boolean {
  return !origin || getAllowedOrigins().includes(origin);
}

export const corsOrigin = (
  origin: string | undefined,
  callback: OriginCallback,
) => callback(null, isAllowedOrigin(origin));

// socket.io applies `cors` only to HTTP long-polling. The WebSocket upgrade
// is checked here, which is what blocks cross-site WebSocket hijacking.
export const websocketGatewayOptions = {
  cors: { origin: corsOrigin, credentials: true },
  allowRequest: (
    req: IncomingMessage,
    callback: (err: string | null | undefined, success: boolean) => void,
  ) => callback(null, isAllowedOrigin(req.headers.origin)),
};
