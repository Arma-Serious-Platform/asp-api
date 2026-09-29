import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { createHash } from 'crypto';
import { Request } from 'express';

@Injectable()
export class PublicApiThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, unknown>): Promise<string> {
    const request = req as unknown as Request;
    const header = request.headers?.['x-api-key'];
    const rawKey = typeof header === 'string' ? header.trim() : undefined;

    if (rawKey) {
      return `key:${createHash('sha256').update(rawKey).digest('hex')}`;
    }

    const ip =
      (request.headers?.['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      request.ip ||
      request.socket?.remoteAddress ||
      'unknown';

    return `ip:${ip}`;
  }
}
