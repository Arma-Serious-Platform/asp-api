import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { Request } from 'express';
import { AuthService } from 'src/modules/auth/auth.service';

/**
 * Sets req.userId / req.roles when the request is authenticated, but lets
 * anonymous requests through. For public endpoints that show more to owners
 * or admins.
 */
@Injectable()
export class OptionalAuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<Request & { userId?: string; roles?: UserRole[] }>();
    const authUser = await this.authService.resolveRequestUser(request);

    if (authUser) {
      request.userId = authUser.userId;
      request.roles = authUser.roles;
    }

    return true;
  }
}
