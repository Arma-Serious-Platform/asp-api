import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Roles } from 'src/shared/decorators/roles.decorator';
import { AuthService } from 'src/modules/auth/auth.service';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private readonly authService: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const roles = this.reflector.get(Roles, context.getHandler());
    const request = context.switchToHttp().getRequest();

    const authUser = await this.authService.resolveRequestUser(request);

    if (!authUser) {
      throw new UnauthorizedException('Authentication required');
    }

    request.userId = authUser.userId;
    request.role = authUser.role;

    return !roles || !roles.length || roles.includes(authUser.role);
  }
}
