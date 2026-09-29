import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request, Response } from 'express';
import { RateLimit } from 'src/shared/decorators/rate-limit.decorator';
import { FixedWindowRateLimiter } from 'src/shared/utils/rate-limiter';

// Shared by every controller that uses the guard.
const limiter = new FixedWindowRateLimiter();

/**
 * Applies the @RateLimit rules of the handler. Place it after AuthGuard in the
 * same @UseGuards(...) call when a rule keys on req.userId.
 */
@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const rules = this.reflector.get(RateLimit, context.getHandler()) ?? [];
    const http = context.switchToHttp();
    const req = http.getRequest<Request & { userId?: string }>();

    for (const rule of rules) {
      const key = rule.key(req);
      if (!key) {
        continue;
      }

      const result = limiter.hit(
        `${rule.name}:${key}`,
        rule.limit,
        rule.windowSeconds * 1000,
      );

      if (!result.allowed) {
        http
          .getResponse<Response>()
          .setHeader('Retry-After', Math.ceil(result.retryAfterMs / 1000));
        throw new HttpException(
          'Забагато спроб. Спробуйте пізніше.',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    }

    return true;
  }
}
