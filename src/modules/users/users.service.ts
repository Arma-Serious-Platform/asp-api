import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { compare, hash } from 'bcryptjs';
import { LoginUserDto } from './dto/login-user.dto';
import { JwtService } from '@nestjs/jwt';
import { GetMeDto } from './dto/get-me-dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService, private readonly jwtService: JwtService) { }

  async me(dto: GetMeDto) {
    const user = await this.prisma.user.findFirst({
      where: {
        id: dto.id
      },

      select: {
        password: false
      }
    });

    return user;
  }

  async signUp(createUserDto: CreateUserDto) {

    const existedUser = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: createUserDto.email },
          { nickname: createUserDto.nickname }
        ]
      }
    });

    if (existedUser) {
      throw new BadRequestException('User already exists');
    }

    const hashedPassword = await hash(createUserDto.password, 15);

    await this.prisma.user.create({
      data: {
        ...createUserDto,
        password: hashedPassword
      }
    });
  }

  async login(loginUserDto: LoginUserDto) {
    const { email, password } = loginUserDto;

    const user = await this.prisma.user.findFirst({
      where: { email }
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await compare(password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const token = await this.jwtService.signAsync({
      userId: user.id,
      email: user.email,
      nickname: user.nickname,
      role: user.role
    });

    const refreshToken = await this.jwtService.signAsync({
      userId: user.id,
    }, {
      secret: process.env.JWT_SECRET,
      expiresIn: '7d'
    });

    const { password: _, ...userWithoutPassword } = user;

    return {
      user: {
        ...userWithoutPassword,
      },
      token,
      refreshToken
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
