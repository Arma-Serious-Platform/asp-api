import { ApiProperty } from '@nestjs/swagger';
import { UserRole, UserStatus } from '@prisma/client';
import { PublicFileDto, PublicSideShortDto } from './public-common.dto';

class PublicUserSquadDto {
  @ApiProperty({ example: '2a6d7b86-57b4-4ca4-8f87-6aab1fcd8c23' })
  id: string;

  @ApiProperty({ example: '1st Mechanized' })
  name: string;

  @ApiProperty({ example: '1MEC' })
  tag: string;

  @ApiProperty({ example: '4c4d0611-9f81-4ffd-b4ce-c8fe8f7f3b8b' })
  leaderId: string;

  @ApiProperty({ type: PublicSideShortDto, nullable: true })
  side: PublicSideShortDto | null;
}

export class PublicUserDto {
  @ApiProperty({ example: '4c4d0611-9f81-4ffd-b4ce-c8fe8f7f3b8b' })
  id: string;

  @ApiProperty({ example: 'PlayerOne' })
  nickname: string;

  @ApiProperty({ example: 'ACTIVE', enum: UserStatus })
  status: UserStatus;

  @ApiProperty({ example: ['USER'], enum: UserRole, isArray: true })
  roles: UserRole[];

  @ApiProperty({ example: 'https://t.me/playerone', nullable: true })
  telegramUrl: string | null;

  @ApiProperty({ example: 'https://discord.gg/example', nullable: true })
  discordUrl: string | null;

  @ApiProperty({ nullable: true })
  youtubeUrl: string | null;

  @ApiProperty({ nullable: true })
  twitchUrl: string | null;

  @ApiProperty({ nullable: true })
  tiktokUrl: string | null;

  @ApiProperty({ type: PublicFileDto, nullable: true })
  avatar: PublicFileDto | null;

  @ApiProperty({ type: PublicUserSquadDto, nullable: true })
  squad: PublicUserSquadDto | null;
}

export class PublicUserListResponseDto {
  @ApiProperty({ type: [PublicUserDto] })
  data: PublicUserDto[];

  @ApiProperty({ example: 123 })
  total: number;

  @ApiProperty({ example: 0 })
  skip: number;

  @ApiProperty({ example: 50 })
  take: number;
}
