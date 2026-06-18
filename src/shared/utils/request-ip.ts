import { Request } from 'express';

export function getRequestIp(req: Request) {
  const forwardedFor = req.headers['x-forwarded-for'];

  if (Array.isArray(forwardedFor)) {
    return forwardedFor[0]?.split(',')[0]?.trim();
  }

  if (typeof forwardedFor === 'string') {
    return forwardedFor.split(',')[0]?.trim();
  }

  return req.ip || req.socket?.remoteAddress;
}
