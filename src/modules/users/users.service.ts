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

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly mailerService: MailerService,
  ) {}

  private generateActivationToken() {
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24); // 1 day

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

    const { email, activationToken } = await this.prisma.user.create({
      data: {
        ...createUserDto,
        password: hashedPassword,
        role: 'USER',
        status: 'INVITED',
        ...this.generateActivationToken(),
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

  findAll() {
    return `This action returns all users`;
  }

  findOne(id: number) {
    return `This action returns a #${id} user`;
  }

  update(id: number, updateUserDto: UpdateUserDto) {
    console.log(updateUserDto);

    return `This action updates a #${id} user`;
  }

  remove(id: number) {
    return `This action removes a #${id} user`;
  }
}
