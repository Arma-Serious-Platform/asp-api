import { ForbiddenException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserRole, UserStatus } from '@prisma/client';
import { Request, Response } from 'express';
import { PrismaService } from 'src/infrastructure/prisma/prisma.service';
import { UsersService } from 'src/modules/users/users.service';
import {
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_DAYS,
  SESSION_TTL_DAYS,
} from './auth.constants';
import { SessionLoginDto } from './dto/session-login.dto';
import { getRequestIp } from 'src/shared/utils/request-ip';

export type ResolvedAuthUser = {
  userId: string;
  role: UserRole;
};

type HandshakeLike = {
  headers?: {
    authorization?: string;
    cookie?: string;
  };
  auth?: Record<string, unknown>;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
  ) {}

  private getSessionExpiresAt(createdAt: Date) {
    const ttlMs = SESSION_TTL_DAYS * 24 * 60 * 60 * 1000;
    const maxAgeMs = SESSION_MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
    const slidingExpiresAt = new Date(Date.now() + ttlMs);
    const maxExpiresAt = new Date(createdAt.getTime() + maxAgeMs);

    return slidingExpiresAt < maxExpiresAt ? slidingExpiresAt : maxExpiresAt;
  }

  private getCookieOptions(expiresAt: Date) {
    return {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      path: '/',
      expires: expiresAt,
    };
  }

  private parseDevice(userAgent?: string, device?: string) {
    if (device?.trim()) {
      return device.trim();
    }

    if (!userAgent?.trim()) {
      return undefined;
    }

    return userAgent.slice(0, 255);
  }

  async createSession(
    userId: string,
    req: Request,
    device?: string,
  ) {
    const now = new Date();
    const expiresAt = this.getSessionExpiresAt(now);
    const ip = getRequestIp(req);
    const userAgent = req.headers['user-agent'];

    return await this.prisma.userSession.create({
      data: {
        userId,
        ip,
        userAgent,
        device: this.parseDevice(userAgent, device),
        expiresAt,
        lastActiveAt: now,
      },
    });
  }

  setSessionCookie(res: Response, sessionId: string, expiresAt: Date) {
    res.clearCookie(SESSION_COOKIE_NAME, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/api',
    });
    res.cookie(SESSION_COOKIE_NAME, sessionId, this.getCookieOptions(expiresAt));
  }

  clearSessionCookie(res: Response) {
    res.clearCookie(SESSION_COOKIE_NAME, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });
  }

  async sessionLogin(dto: SessionLoginDto, req: Request, res: Response) {
    const user = await this.usersService.authenticateLoginUser(
      dto,
      getRequestIp(req),
    );

    const session = await this.createSession(user.id, req, dto.device);
    this.setSessionCookie(res, session.id, session.expiresAt);

    const me = await this.usersService.me(user.id);

    return { user: me };
  }

  async sessionLogout(req: Request, res: Response) {
    const sessionId = req.cookies?.[SESSION_COOKIE_NAME] as string | undefined;

    if (sessionId) {
      await this.prisma.userSession.updateMany({
        where: {
          id: sessionId,
          revokedAt: null,
        },
        data: {
          revokedAt: new Date(),
        },
      });
    }

    this.clearSessionCookie(res);

    return { message: 'Logged out successfully' };
  }

  private async resolveUserFromJwt(token: string): Promise<ResolvedAuthUser | null> {
    try {
      const { userId } = await this.jwtService.verifyAsync<{ userId: string }>(
        token,
        { secret: process.env.JWT_SECRET },
      );

      if (!userId) {
        return null;
      }

      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          role: true,
          status: true,
        },
      });

      if (!user || user.status === UserStatus.BANNED) {
        return null;
      }

      return {
        userId: user.id,
        role: user.role,
      };
    } catch {
      return null;
    }
  }

  private async resolveUserFromSession(
    sessionId: string,
  ): Promise<ResolvedAuthUser | null> {
    const session = await this.prisma.userSession.findUnique({
      where: { id: sessionId },
      select: {
        id: true,
        userId: true,
        expiresAt: true,
        revokedAt: true,
        createdAt: true,
        lastActiveAt: true,
        user: {
          select: {
            id: true,
            role: true,
            status: true,
          },
        },
      },
    });

    if (
      !session ||
      session.revokedAt ||
      session.expiresAt < new Date() ||
      session.user.status === UserStatus.BANNED
    ) {
      return null;
    }

    const nextExpiresAt = this.getSessionExpiresAt(session.createdAt);
    const now = new Date();

    if (nextExpiresAt > session.expiresAt) {
      await this.prisma.userSession.update({
        where: { id: session.id },
        data: {
          expiresAt: nextExpiresAt,
          lastActiveAt: now,
        },
      });
    } else if (session.lastActiveAt < new Date(now.getTime() - 60_000)) {
      await this.prisma.userSession.update({
        where: { id: session.id },
        data: { lastActiveAt: now },
      });
    }

    return {
      userId: session.user.id,
      role: session.user.role,
    };
  }

  async resolveRequestUser(req: Request): Promise<ResolvedAuthUser | null> {
    const authHeader = req.headers.authorization;

    if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice('Bearer '.length).trim();
      const jwtUser = await this.resolveUserFromJwt(token);
      if (jwtUser) {
        return jwtUser;
      }
    }

    const sessionId = req.cookies?.[SESSION_COOKIE_NAME] as string | undefined;
    if (sessionId) {
      return this.resolveUserFromSession(sessionId);
    }

    return null;
  }

  private parseCookieHeader(cookieHeader?: string) {
    if (!cookieHeader) {
      return {} as Record<string, string>;
    }

    return Object.fromEntries(
      cookieHeader.split(';').map((part) => {
        const index = part.indexOf('=');
        if (index === -1) {
          return [part.trim(), ''];
        }

        const key = part.slice(0, index).trim();
        const value = part.slice(index + 1).trim();

        return [key, decodeURIComponent(value)];
      }),
    );
  }

  async resolveHandshakeUser(handshake: HandshakeLike): Promise<ResolvedAuthUser | null> {
    const authHeader = handshake.headers?.authorization;
    if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
      const jwtUser = await this.resolveUserFromJwt(authHeader.slice('Bearer '.length).trim());
      if (jwtUser) {
        return jwtUser;
      }
    }

    const authToken = handshake.auth?.token;
    if (typeof authToken === 'string' && authToken.length > 0) {
      const jwtUser = await this.resolveUserFromJwt(authToken);
      if (jwtUser) {
        return jwtUser;
      }
    }

    const cookies = this.parseCookieHeader(handshake.headers?.cookie);
    const sessionId = cookies[SESSION_COOKIE_NAME];
    if (sessionId) {
      return this.resolveUserFromSession(sessionId);
    }

    return null;
  }

  async getSessionUser(req: Request) {
    const authUser = await this.resolveRequestUser(req);
    if (!authUser) {
      throw new UnauthorizedException('Not authenticated');
    }

    return this.usersService.me(authUser.userId);
  }

  async getActiveSessions(userId: string, req: Request) {
    const currentSessionId = req.cookies?.[SESSION_COOKIE_NAME] as string | undefined;

    const sessions = await this.prisma.userSession.findMany({
      where: {
        userId,
        revokedAt: null,
        expiresAt: {
          gte: new Date(),
        },
      },
      select: {
        id: true,
        ip: true,
        userAgent: true,
        device: true,
        location: true,
        expiresAt: true,
        lastActiveAt: true,
        createdAt: true,
      },
      orderBy: {
        lastActiveAt: 'desc',
      },
    });

    return sessions.map((session) => ({
      ...session,
      isCurrent: currentSessionId === session.id,
    }));
  }

  async revokeSessionById(userId: string, sessionId: string, req: Request, res: Response) {
    const session = await this.prisma.userSession.findUnique({
      where: { id: sessionId },
      select: {
        id: true,
        userId: true,
        revokedAt: true,
      },
    });

    if (!session || session.userId !== userId) {
      throw new NotFoundException('Session not found');
    }

    if (session.revokedAt) {
      throw new ForbiddenException('Session is already revoked');
    }

    await this.prisma.userSession.update({
      where: { id: sessionId },
      data: {
        revokedAt: new Date(),
      },
    });

    const currentSessionId = req.cookies?.[SESSION_COOKIE_NAME] as string | undefined;
    if (currentSessionId === sessionId) {
      this.clearSessionCookie(res);
    }

    return { message: 'Session revoked successfully' };
  }
}
