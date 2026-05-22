import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { SignUpDto } from './dto/create-user.dto';

import { Multer } from 'multer';
import { PrismaService } from 'src/infrastructure/prisma/prisma.service';
import { compare, hash } from 'bcryptjs';
import { LoginUserDto } from './dto/login-user.dto';
import { JwtService } from '@nestjs/jwt';
import { GetMeDto } from './dto/get-me-dto';
import { MailerService } from '@nestjs-modules/mailer';
import { createHash, randomBytes } from 'node:crypto';
import { ChangeUserRoleDto } from './dto/change-user-role.dto';
import { ConfirmSignUpDto } from './dto/confirm-sign-up.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { BanUserDto } from './dto/ban-user.dto';
import { Prisma, User, UserPunishmentType, UserRole, UserStatus } from '@prisma/client';
import { UnbanUserDto } from './dto/unban-user.dto';
import { GetUsersDto } from './dto/get-users.dto';
import { ASP_BUCKET } from 'src/infrastructure/minio/minio.lib';
import { MinioService } from 'src/infrastructure/minio/minio.service';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { UpdateMeDto } from './dto/update-me.dto';
import { ChangeIsMissionReviewerDto } from './dto/change-is-mission-reviewer.dto';
import { ChangeNicknameDto } from './dto/change-nickname.dto';
import { EmailTemplateService } from 'src/shared/services/email-template.service';
import { CreateUserWarningDto } from './dto/create-user-warning.dto';
import { OptionalPunishmentReasonDto, PunishmentReasonDto } from './dto/punishment-reason.dto';

@Injectable()
export class UsersService {
  private static readonly STEAM_OPENID_ENDPOINT = 'https://steamcommunity.com/openid/login';

  private static readonly ROLE_RANK: Record<UserRole, number> = {
    [UserRole.USER]: 0,
    [UserRole.MINI_ADMIN]: 1,
    [UserRole.GAME_ADMIN]: 2,
    [UserRole.TECH_ADMIN]: 3,
    [UserRole.UVK]: 4,
    [UserRole.SERVER_ADMIN]: 5,
    [UserRole.OWNER]: 6,
  };

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly mailerService: MailerService,
    private readonly minioService: MinioService,
  ) { }

  private generateActivationToken(minutes = 10) {
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 1000 * 60 * minutes); // 10 minutes

    return {
      token,
      expiresAt,
    };
  }

  private sendActivationToken = async (email: string, token: string) => {
    const activationLink = `${process.env.ACTIVATE_TOKEN_FRONTEND_URL}?token=${token}`;
    await this.mailerService.sendMail({
      to: email,
      subject: 'Активуйте ваш обліковий запис',
      html: EmailTemplateService.createActivationEmail(activationLink),
    });
  };

  private canSeeSensitiveUsersData(role: UserRole) {
    return role === UserRole.OWNER || role === UserRole.SERVER_ADMIN;
  }

  private generateGuidFromSteamId64(steamId64: string) {
    let steamId = BigInt(steamId64);
    const bytes = Buffer.alloc(8);

    for (let i = 0; i < 8; i++) {
      bytes[i] = Number(steamId & 0xffn);
      steamId >>= 8n;
    }

    return createHash('md5')
      .update(Buffer.concat([Buffer.from('BE'), bytes]))
      .digest('hex');
  }

  private ensureCanModerateTarget(targetRole: UserRole, actorRole: UserRole) {
    if (targetRole === UserRole.OWNER) {
      throw new BadRequestException('You cannot moderate user with OWNER role');
    }

    if (
      actorRole !== UserRole.OWNER &&
      UsersService.ROLE_RANK[actorRole] <= UsersService.ROLE_RANK[targetRole]
    ) {
      throw new BadRequestException('You cannot moderate user with your level of access');
    }
  }

  getFrontendSteamLinkedRedirectUrl() {
    return process.env.FRONTEND_STEAM_LINKED_URL ?? '/';
  }

  getSteamLoginRedirectUrl(accessToken: string, callbackUrl: string) {
    const params = new URLSearchParams({
      'openid.ns': 'http://specs.openid.net/auth/2.0',
      'openid.mode': 'checkid_setup',
      'openid.return_to': `${callbackUrl}?accessToken=${accessToken ?? ''}`,
      'openid.realm': `${new URL(callbackUrl).origin}/`,
      'openid.identity': 'http://specs.openid.net/auth/2.0/identifier_select',
      'openid.claimed_id': 'http://specs.openid.net/auth/2.0/identifier_select',
    });

    return `${UsersService.STEAM_OPENID_ENDPOINT}?${params.toString()}`;
  }

  async linkSteamFromCallback(
    query: Record<string, string | string[] | undefined>
  ) {
    const accessToken = this.getSingleQueryValue(query.accessToken);
    if (!accessToken) {
      return;
    }

    const data = this.jwtService.decode<{userId: string }>(accessToken);

    if (!data?.userId) return;

    const { userId } = data;


    const steamId = this.extractAndVerifySteamId(query);

    if (!steamId) {
      return;
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        steamId: true,
      },
    });

    if (!user || user.steamId) {
      return;
    }

    const steamIdAlreadyLinked = await this.prisma.user.findFirst({
      where: {
        steamId,
        id: {
          not: userId,
        },
      },
      select: {
        id: true,
      },
    });

    if (steamIdAlreadyLinked) {
      return;
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { steamId },
    });
  }

  private getSingleQueryValue(value: string | string[] | undefined) {
    return Array.isArray(value) ? value[0] : value;
  }

  private extractAndVerifySteamId(
    query: Record<string, string | string[] | undefined>
  ) {
    const claimedId = this.getSingleQueryValue(query['openid.claimed_id']);
    if (!claimedId) {
      return null;
    }

    const marker = '/id/';
    const markerIndex = claimedId.indexOf(marker);
    if (markerIndex === -1) {
      return null;
    }

    const steamId = claimedId.slice(markerIndex + marker.length).trim();
    if (!steamId) {
      return null;
    }

    return steamId;
  }

  async updateMe(userId: string, updateMeDto: UpdateMeDto) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: updateMeDto,
    });
  }

  async changeNickname(userId: string, dto: ChangeNicknameDto, actorRole?: UserRole) {
    const nickname = dto.nickname.trim();

    if (!nickname) {
      throw new BadRequestException('Nickname is required');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, nickname: true, role: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (actorRole) {
      this.ensureCanModerateTarget(user.role, actorRole);
    }

    if (user.nickname === nickname) {
      return this.prisma.user.findUnique({
        where: { id: userId },
        omit: { password: true },
      });
    }

    const nicknameTaken = await this.prisma.user.findFirst({
      where: {
        nickname,
        NOT: { id: userId },
      },
    });

    if (nicknameTaken) {
      throw new BadRequestException('Nickname is already taken');
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: { nickname },
      omit: { password: true },
    });
  }

  async disconnectSteam(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, steamId: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.steamId) {
      return this.prisma.user.findUnique({
        where: { id: userId },
        omit: { password: true },
      });
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: { steamId: null },
      omit: { password: true },
    });
  }

  async me(userId: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
      },

      include: {
        _count: {
          select: {
            missions: true
          }
        },
        avatar: {
          select: {
            id: true,
            url: true,
          },
        },
        side: {
          select: {
            id: true,
            name: true,
          },
        },
        squadInvites: {
          select: {
            id: true,
            status: true,
            squadId: true,
            createdAt: true,
            updatedAt: true,
            squad: {
              select: {
                id: true,
                name: true,
                tag: true,
                logo: {
                  select: {
                    url: true
                  }
                }
              },
            },
          },
        },
        squad: {
          select: {
            id: true,
            name: true,
            tag: true,
            logo: {
              select: {
                id: true,
                url: true,
              }
            },
            members: {
              select: {
                id: true,
                nickname: true,
                role: true,
                avatarUrl: true,
                squad: {
                  select: {
                    id: true,
                    tag: true,
                    side: {
                      select :{
                        id: true,
                        name: true,
                        type: true,
                      }
                    }
                  }
                },
                status: true,
                avatar: {
                  select: {
                    id: true,
                    url: true,
                  },
                },
              },
            },
            leader: {
              select: {
                id: true,
              },
            },
            side: {
              select: {
                id: true,
                type: true,
                name: true
              }
            }
          },
        },
      },

      omit: {
        password: true,
        squadId: true,
        abilities: true,
        activationToken: true,
        resetPasswordToken: true,
        resetPasswordTokenExpiresAt: true,
        activationTokenExpiresAt: true,
        lastIp: true
      },
    });

    return user;
  }

  async confirmSignUp(dto: ConfirmSignUpDto) {
    const user = await this.prisma.user.findFirst({
      where: { activationToken: dto.token },
    });

    if (!user) {
      throw new BadRequestException('Invalid token');
    }

    if (!user.isEmailVerified) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          isEmailVerified: true,
          activationToken: null,
          activationTokenExpiresAt: null,
        },
      });

      return {
        message: 'User finished sign up successfully',
      };
    }

    throw new BadRequestException('User already confirmed');
  }

  async signUp(signUpDto: SignUpDto) {
    const existedUser = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: signUpDto.email }, { nickname: signUpDto.nickname }],
      },
    });

    if (existedUser) {
      throw new BadRequestException('User already exists');
    }

    const hashedPassword = await hash(signUpDto.password, 15);
    const { token, expiresAt } = this.generateActivationToken();

    const { email, activationToken } = await this.prisma.user.create({
      data: {
        ...signUpDto,
        password: hashedPassword,
        role: 'USER',
        isEmailVerified: false,
        activationToken: token,
        activationTokenExpiresAt: expiresAt,
      },
    });

    await this.sendActivationToken(email, activationToken!);
  }

  async changeUserRole(dto: ChangeUserRoleDto) {
    const user = await this.prisma.user.findFirst({
      where: { id: dto.id },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.role === dto.role) {
      throw new BadRequestException('User already has this role');
    }

    if (user.role === 'OWNER') {
      throw new BadRequestException(
        'You cannot change role of user with OWNER role',
      );
    }

    await this.prisma.user.update({
      where: { id: dto.id },
      data: { role: dto.role },
    });

    return {
      message: 'User role updated successfully',
    };
  }

  async changeIsMissionReviewer(dto: ChangeIsMissionReviewerDto) {
    const user = await this.prisma.user.findFirst({
      where: { id: dto.userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.prisma.user.update({
      where: { id: dto.userId },
      data: { isMissionReviewer: dto.isMissionReviewer },
    });

    return {
      message: dto.isMissionReviewer ? 'User is now a mission reviewer' : 'User is no longer a mission reviewer',
    };
  }

  async createWarning(userId: string, dto: CreateUserWarningDto, adminId: string, actorRole: UserRole) {
    const reason = dto.reason.trim();

    if (!reason) {
      throw new BadRequestException('Warning reason is required');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    this.ensureCanModerateTarget(user.role, actorRole);

    return this.prisma.$transaction(async tx => {
      const warning = await tx.userWarning.create({
        data: {
          userId,
          adminId,
          reason,
        },
        include: {
          user: {
            select: {
              id: true,
              nickname: true,
            },
          },
          admin: {
            select: {
              id: true,
              nickname: true,
            },
          },
        },
      });

      await tx.userPunishment.create({
        data: {
          userId,
          adminId,
          warningId: warning.id,
          type: UserPunishmentType.WARNING,
          reason,
        },
      });

      return warning;
    });
  }

  async findWarnings(userId: string, actorRole: UserRole) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    this.ensureCanModerateTarget(user.role, actorRole);

    return this.prisma.userWarning.findMany({
      where: { userId, removedAt: null },
      orderBy: { createdAt: 'desc' },
      include: {
        admin: {
          select: {
            id: true,
            nickname: true,
          },
        },
        removedBy: {
          select: {
            id: true,
            nickname: true,
          },
        },
      },
    });
  }

  async removeWarning(warningId: string, dto: OptionalPunishmentReasonDto, adminId: string, actorRole: UserRole) {
    const warning = await this.prisma.userWarning.findUnique({
      where: { id: warningId },
      include: {
        user: {
          select: {
            id: true,
            role: true,
          },
        },
      },
    });

    if (!warning) {
      throw new NotFoundException('Warning not found');
    }

    if (warning.removedAt) {
      throw new BadRequestException('Warning is already removed');
    }

    this.ensureCanModerateTarget(warning.user.role, actorRole);

    const reason = dto.reason?.trim() || null;

    return this.prisma.$transaction(async tx => {
      const removedWarning = await tx.userWarning.update({
        where: { id: warningId },
        data: {
          removedAt: new Date(),
          removedById: adminId,
          removeReason: reason,
        },
        include: {
          admin: {
            select: {
              id: true,
              nickname: true,
            },
          },
          removedBy: {
            select: {
              id: true,
              nickname: true,
            },
          },
        },
      });

      await tx.userPunishment.create({
        data: {
          userId: warning.userId,
          adminId,
          warningId,
          type: UserPunishmentType.WARNING_REMOVED,
          reason,
        },
      });

      return removedWarning;
    });
  }

  async findPunishmentHistory(userId: string, actorRole: UserRole) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    this.ensureCanModerateTarget(user.role, actorRole);

    return this.prisma.userPunishment.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        admin: {
          select: {
            id: true,
            nickname: true,
          },
        },
        warning: {
          select: {
            id: true,
            reason: true,
            removedAt: true,
            removeReason: true,
          },
        },
      },
    });
  }

  private async generateTokens(user: { id: string }) {
    const token = await this.jwtService.signAsync(
      {
        userId: user.id,
      },
      {
        secret: process.env.JWT_SECRET,
        expiresIn: '24h',
      },
    );

    const refreshToken = await this.jwtService.signAsync(
      {
        userId: user.id,
      },
      {
        secret: process.env.JWT_SECRET,
        expiresIn: '7d',
      },
    );

    return {
      token,
      refreshToken,
    };
  }

  async login(loginUserDto: LoginUserDto, lastIp?: string) {
    const { emailOrNickname, password } = loginUserDto;

    const user = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: emailOrNickname }, { nickname: emailOrNickname }],
      },
      omit: {
        squadId: true,
        abilities: true,
      },
      include: {
        squad: {
          select: {
            id: true,
            name: true,
            tag: true,
            logo: {
              select: {
                id: true,
                url: true,
              },
            },
            side: {
              select: {
                id: true,
                name: true,
                server: true,
                type: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await compare(password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isEmailVerified) {
      if (
        !user.activationToken ||
        !user.activationTokenExpiresAt ||
        user.activationTokenExpiresAt < new Date()
      ) {
        const { token, expiresAt } = this.generateActivationToken();

        await this.prisma.user.update({
          where: { id: user.id },
          data: { activationToken: token, activationTokenExpiresAt: expiresAt },
        });

        await this.sendActivationToken(user.email, user.activationToken!);

        throw new BadRequestException(
          'Activation token expired. New token sent to your email',
        );
      } else {
        throw new BadRequestException(
          'Activation token expired. Check your email for a new token',
        );
      }
    }

    if (lastIp && user.lastIp !== lastIp) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { lastIp },
      });
    }

    const data = await this.generateTokens(user);

    const { password: _, ...userWithoutPassword } = user;

    return {
      user: {
        ...userWithoutPassword,
        lastIp: lastIp ?? user.lastIp,
      },
      ...data,
    };
  }

  async refreshToken(dto: RefreshTokenDto) {
    try {
      const { userId } = await this.jwtService.verifyAsync<{ userId: string }>(
        dto.refreshToken,
        {
          secret: process.env.JWT_SECRET,
        },
      );

      const user = await this.me(userId);

      if (!user) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      const data = await this.generateTokens(user);

      return {
        user,
        ...data,
      };
    } catch (error) {
      if (
        error?.name === 'JsonWebTokenError' ||
        error?.name === 'TokenExpiredError' ||
        error?.name === 'NotBeforeError'
      ) {
        throw new UnauthorizedException('Invalid or expired refresh token');
      }
      throw error;
    }
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.prisma.user.findFirst({
      where: { email: dto.email },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (
      user.resetPasswordToken &&
      user.resetPasswordTokenExpiresAt &&
      user.resetPasswordTokenExpiresAt > new Date()
    ) {
      throw new BadRequestException('Reset password token is still valid');
    }

    const { token, expiresAt } = this.generateActivationToken(10);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        resetPasswordToken: token,
        resetPasswordTokenExpiresAt: expiresAt,
      },
    });

    const resetLink = `${process.env.RESET_PASSWORD_FRONTEND_URL}?token=${token}`;
    await this.mailerService.sendMail({
      to: user.email,
      subject: 'Скинути пароль',
      html: EmailTemplateService.createResetPasswordEmail(resetLink),
    });

    return {
      message: 'Reset password token sent to your email',
    };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const user = await this.prisma.user.findFirst({
      where: { resetPasswordToken: dto.token },
    });

    if (!user) {
      throw new BadRequestException('Token is invalid');
    }

    if (
      user.resetPasswordTokenExpiresAt &&
      user.resetPasswordTokenExpiresAt < new Date()
    ) {
      throw new BadRequestException('Reset password token expired');
    }

    const hashedPassword = await hash(dto.newPassword, 15);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetPasswordToken: null,
        resetPasswordTokenExpiresAt: null,
      },
    });

    return {
      message: 'Password changed successfully',
    };
  }

  async changePassword(dto: ChangePasswordDto, userId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId },
      select: {
        id: true,
        password: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isPasswordValid = await compare(dto.oldPassword, user.password);

    if (!isPasswordValid) {
      throw new BadRequestException('Invalid old password');
    }

    const hashedPassword = await hash(dto.newPassword, 15);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    return {
      message: 'Password changed successfully',
    };
  }

  async findAll(dto: GetUsersDto, userRole: UserRole) {
    const { search, take = 50, skip = 0 } = dto;
    const canSeeSensitiveUsersData = this.canSeeSensitiveUsersData(userRole);

    const options: Prisma.UserFindManyArgs = {};

    if (search) {
      const searchConditions: Prisma.UserWhereInput[] = [
        { nickname: { contains: dto.search, mode: 'insensitive' } },
      ];

      if (canSeeSensitiveUsersData) {
        searchConditions.push(
          { email: { contains: dto.search, mode: 'insensitive' } },
          { steamId: { contains: dto.search, mode: 'insensitive' } },
          { lastIp: { contains: dto.search, mode: 'insensitive' } },
        );
      }

      options.where = {
        OR: searchConditions,
      };
    }

    if (dto.role) {
      options.where = {
        ...options.where,
        role: dto.role,
      };
    }

    if (dto.status) {
      options.where = {
        ...options.where,
        status: dto.status,
      };
    }

    if (dto.hasSquad !== undefined) {
      options.where = {
        ...options.where,
        squadId: dto.hasSquad ? { not: null } : null,
      };
    }

    if (dto.hasMission !== undefined) {
      options.where = {
        ...options.where,
        missions: dto.hasMission ? { some: {} } : { none: {} },
      };
    }

    options.skip = skip;
    options.take = take;
    options.include = {
      avatar: {
        select: {
          id: true,
          url: true,
        },
      },
      squad: {
        select: {
          id: true,
          name: true,
          tag: true,
          side: true
        },
      },
      warnings: {
        where: {
          removedAt: null,
        },
        select: {
          id: true,
        },
      },
    };
    options.omit = {
      squadId: true,
      activationToken: true,
      resetPasswordToken: true,
      password: true,
      abilities: true,
      resetPasswordTokenExpiresAt: true,
      activationTokenExpiresAt: true,
      ...(canSeeSensitiveUsersData ? {} : {
        email: true,
        steamId: true,
        lastIp: true,
      }),
    };
    options.orderBy = {
      createdAt: 'desc',
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.user.findMany(options),
      this.prisma.user.count({ where: options.where }),
    ]);

    const usersWithWarnings = data as Array<(typeof data)[number] & { warnings: { id: string }[] }>;
    const dataWithActiveWarningsCount = usersWithWarnings.map(({ warnings, ...user }) => ({
      ...user,
      _count: {
        warnings: warnings.length,
      },
    }));

    return {
      data: dataWithActiveWarningsCount,
      total,
    };
  }

  async findWhitelist() {
    const users = await this.prisma.user.findMany({
      where: {
        steamId: {
          not: null,
        },
      },
      select: {
        nickname: true,
        steamId: true,
        status: true,
        squad: {
          select: {
            tag: true,
          },
        },
      },
      orderBy: {
        nickname: 'asc',
      },
    });

    return users.flatMap((user) => {
      if (!user.steamId) {
        return [];
      }

      return {
        nickname: user.squad?.tag
          ? `[${user.squad.tag}] ${user.nickname}`
          : user.nickname,
        steamId: user.steamId,
        GUID: this.generateGuidFromSteamId64(user.steamId),
        banned: user.status === UserStatus.BANNED,
      };
    });
  }

  findOne(idOrName: string) {
    return this.prisma.user.findFirst({
      where: { OR: [{ id: idOrName }, { nickname: idOrName }] },
      select: {
        id: true,
        nickname: true,
        status: true,
        role: true,
        squad: {
          select: {
            tag: true,
            side: true,
            leaderId: true
          },
        },
        avatar: {
          select: {
            id: true,
            url: true,
          },
        },
        isMissionReviewer: true,
        discordUrl: true,
        youtubeUrl: true,
        twitchUrl: true,
        telegramUrl: true,
      },
    });
  }

  delete(id: string) {
    return this.prisma.user.delete({
      where: { id },
    });
  }

  async banUser(dto: BanUserDto, body: PunishmentReasonDto, adminId: string, role: UserRole) {
    const user = await this.prisma.user.findFirst({
      where: { id: dto.userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    this.ensureCanModerateTarget(user.role, role);

    if (user.status === 'BANNED') {
      throw new BadRequestException('User is already banned');
    }

    const bannedUntil = new Date(dto.bannedUntil);

    if (Number.isNaN(bannedUntil.getTime())) {
      throw new BadRequestException('Invalid ban date');
    }

    if (bannedUntil <= new Date()) {
      throw new BadRequestException('Ban date must be in the future');
    }

    const reason = body.reason.trim();

    if (!reason) {
      throw new BadRequestException('Ban reason is required');
    }

    return this.prisma.$transaction(async tx => {
      const updatedUser = await tx.user.update({
        where: { id: dto.userId },
        data: {
          status: 'BANNED',
          bannedUntil,
        },
      });

      await tx.userPunishment.create({
        data: {
          userId: dto.userId,
          adminId,
          type: UserPunishmentType.TEMP_BAN,
          reason,
          bannedUntil,
        },
      });

      return updatedUser;
    });
  }

  async permanentlyBanUser(dto: UnbanUserDto, body: PunishmentReasonDto, adminId: string, role: UserRole) {
    const user = await this.prisma.user.findFirst({
      where: { id: dto.userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    this.ensureCanModerateTarget(user.role, role);

    if (user.status === 'BANNED') {
      throw new BadRequestException('User is already banned');
    }

    const reason = body.reason.trim();

    if (!reason) {
      throw new BadRequestException('Ban reason is required');
    }

    return this.prisma.$transaction(async tx => {
      const updatedUser = await tx.user.update({
        where: { id: dto.userId },
        data: {
          status: 'BANNED',
          bannedUntil: null,
        },
      });

      await tx.userPunishment.create({
        data: {
          userId: dto.userId,
          adminId,
          type: UserPunishmentType.PERMANENT_BAN,
          reason,
        },
      });

      return updatedUser;
    });
  }

  async unbanUser(dto: UnbanUserDto, body: OptionalPunishmentReasonDto, adminId: string, role: UserRole) {
    const user = await this.prisma.user.findFirst({
      where: { id: dto.userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    this.ensureCanModerateTarget(user.role, role);

    const reason = body.reason?.trim() || null;

    return this.prisma.$transaction(async tx => {
      const updatedUser = await tx.user.update({
        where: { id: dto.userId },
        data: { status: 'ACTIVE', bannedUntil: null },
      });

      await tx.userPunishment.create({
        data: {
          userId: dto.userId,
          adminId,
          type: UserPunishmentType.UNBAN,
          reason,
        },
      });

      return updatedUser;
    });
  }

  async changeAvatar(avatar: Multer.File, userId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.avatarId) {
      await this.minioService.deleteFile(user.avatarId);
    }

    const avatarUrl = await this.minioService.uploadFile(
      ASP_BUCKET.AVATARS,
      avatar,
    );

    return this.prisma.user.update({
      include: {
        avatar: {
          select: {
            id: true,
            url: true,
            filename: true,
            bucket: true,
          },
        },
      },
      where: { id: userId },
      data: { avatarId: avatarUrl.id },
    });
  }
}
