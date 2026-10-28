import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Request } from 'express';
import { getAllowedOrigins } from 'src/shared/utils/allowed-origins';

/**
 * Refuses state-changing requests sent by a browser from another site. Session
 * cookies are SameSite=Lax, so any page of the same domain (a sibling
 * subdomain) could otherwise submit a form with them; CORS does not stop a
 * plain form post. Browsers always send Origin on such requests. Requests
 * without it come from non-browser clients, which hold no user cookies, and
 * the API's own origin (Swagger UI) is allowed.
 */
@Injectable()
export class TrustedOriginGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const { origin } = req.headers;

    if (req.method === 'GET' || req.method === 'HEAD' || !origin) {
      return true;
    }

    if (getAllowedOrigins().includes(origin) || isSameOrigin(origin, req)) {
      return true;
    }

    throw new ForbiddenException('Request must come from the VTG site');
  }
}

function isSameOrigin(origin: string, req: Request) {
  try {
    return new URL(origin).host === req.headers.host;
  } catch {
    return false;
  }
}
