/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Roles } from 'src/shared/decorators/roles.decorator';
import { PrismaService } from 'src/infrastructure/prisma/prisma.service';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) { }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const roles = this.reflector.get(Roles, context.getHandler());

    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization as string;

    if (!authHeader || !authHeader.includes('Bearer')) return false;

    const token = authHeader.split(' ')[1];

    const decoded = this.jwtService.decode(token);

    const userId = decoded?.userId as unknown as string | undefined;

    if (!userId) return false;

    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
    });

    if (!user) return false;

    request.userId = userId;
    request.role = user.role;

    return !roles || !roles.length || roles.includes(user.role);
  }
}