import { Reflector } from '@nestjs/core';
import { Request } from 'express';

export type RateLimitRule = {
  /** Distinguishes counters of different rules on the same key. */
  name: string;
  limit: number;
  windowSeconds: number;
  /** Returns the counter key for this request, or undefined to skip the rule. */
  key: (req: Request & { userId?: string }) => string | undefined;
};

export const RateLimit = Reflector.createDecorator<RateLimitRule[]>();
