import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { compare, hash } from 'bcryptjs';
import { LoginUserDto } from './dto/login-user.dto';
import { JwtService } from '@nestjs/jwt';
import { GetMeDto } from './dto/get-me-dto';
import { MailerService } from '@nestjs-modules/mailer';
import { randomBytes } from 'node:crypto';
import { UserRole } from '@prisma/client';
import { ChangeUserRoleDto } from './dto/change-user-role.dto';
import { ConfirmSignUpDto } from './dto/confirm-sign-up.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly mailerService: MailerService,
  ) {}

  private generateActivationToken(minutes = 10) {
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 1000 * 60 * minutes); // 10 minutes

    return {
      token,
      expiresAt,
    };
  }

  private sendActivationToken = async (email: string, token: string) => {
    await this.mailerService.sendMail({
      to: email,
      subject: 'Activation token',
      html: `<p>Please, click on the link below to activate your account</p>
      <a href="${process.env.ACTIVATE_TOKEN_FRONTEND_URL}/${token}">Activate</a>
      `,
    });
  };

  async me(dto: GetMeDto) {
    const user = await this.prisma.user.findFirst({
      where: {
        id: dto.id,
      },

      select: {
        password: false,
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

    if (user?.status === 'INVITED') {
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          status: 'ACTIVE',
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

  async signUp(createUserDto: CreateUserDto) {
    const existedUser = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: createUserDto.email },
          { nickname: createUserDto.nickname },
        ],
      },
    });

    if (existedUser) {
      throw new BadRequestException('User already exists');
    }

    const hashedPassword = await hash(createUserDto.password, 15);
    const { token, expiresAt } = this.generateActivationToken();

    const { email, activationToken } = await this.prisma.user.create({
      data: {
        ...createUserDto,
        password: hashedPassword,
        role: 'USER',
        status: 'INVITED',
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

    await this.prisma.user.update({
      where: { id: dto.id },
      data: { role: dto.role },
    });

    return {
      message: 'User role updated successfully',
    };
  }

  async login(loginUserDto: LoginUserDto) {
    const { email, password } = loginUserDto;

    const user = await this.prisma.user.findFirst({
      where: { email },
      omit: {
        sideId: true,
        squadId: true,
      },
      include: {
        squad: {
          select: {
            id: true,
            name: true,
            tag: true,
            logoUrl: true,
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

    if (user.status === 'INVITED') {
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

    const token = await this.jwtService.signAsync({
      userId: user.id,
      email: user.email,
      nickname: user.nickname,
      role: user.role,
    });

    const refreshToken = await this.jwtService.signAsync(
      {
        userId: user.id,
      },
      {
        secret: process.env.JWT_SECRET,
        expiresIn: '7d',
      },
    );

    const { password: _, ...userWithoutPassword } = user;

    return {
      user: {
        ...userWithoutPassword,
      },
      token,
      refreshToken,
    };
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

    return {
      message: 'Reset password token sent to your email',
    };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const user = await this.prisma.user.findFirst({
      where: { resetPasswordToken: dto.token },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (
      user.resetPasswordTokenExpiresAt &&
      user.resetPasswordTokenExpiresAt < new Date()
    ) {
      throw new BadRequestException('Reset password token expired');
    }

    const hashedPassword = await hash(dto.password, 15);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetPasswordToken: null,
        resetPasswordTokenExpiresAt: null,
      },
    });
  }

  async changePassword(dto: ChangePasswordDto) {
    const user = await this.prisma.user.findFirst({
      where: { id: dto.id },
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

  findAll() {
    return `This action returns all users`;
  }

  findOne(id: number) {
    return `This action returns a #${id} user`;
  }

  update(id: number, updateUserDto: UpdateUserDto) {
    return `This action updates a #${id} user`;
  }

  remove(id: number) {
    return `This action removes a #${id} user`;
  }
}
