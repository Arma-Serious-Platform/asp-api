import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { timingSafeEqual } from 'node:crypto';
import { Request } from 'express';

@Injectable()
export class StaticBearerTokenGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const expectedToken = process.env.WHITELIST_BEARER_TOKEN;

    if (!expectedToken) {
      throw new UnauthorizedException('Whitelist token is not configured');
    }

    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractBearerToken(request.headers.authorization);

    if (!token || !this.isTokenEqual(token, expectedToken)) {
      throw new UnauthorizedException('Token is missing or invalid');
    }

    return true;
  }

  private extractBearerToken(authHeader?: string): string | undefined {
    const match = authHeader?.match(/^Bearer\s+(.+)$/i);
    return match?.[1]?.trim();
  }

  private isTokenEqual(token: string, expectedToken: string): boolean {
    const tokenBuffer = Buffer.from(token);
    const expectedTokenBuffer = Buffer.from(expectedToken);

    return (
      tokenBuffer.length === expectedTokenBuffer.length &&
      timingSafeEqual(tokenBuffer, expectedTokenBuffer)
    );
  }
}
