import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import {
  PUBLIC_LEXICAL_JSON_EXAMPLE,
  PublicFileDto,
  PublicSideShortDto,
} from './public-common.dto';

class PublicSquadLeaderDto {
  @ApiProperty({ example: '4c4d0611-9f81-4ffd-b4ce-c8fe8f7f3b8b' })
  id: string;

  @ApiProperty({ example: 'SquadLeader' })
  nickname: string;

  @ApiProperty({ type: PublicFileDto, nullable: true })
  avatar: PublicFileDto | null;
}

class PublicSquadMemberCountDto {
  @ApiProperty({ example: 24 })
  members: number;
}

class PublicSquadMemberDto {
  @ApiProperty({ example: '4c4d0611-9f81-4ffd-b4ce-c8fe8f7f3b8b' })
  id: string;

  @ApiProperty({ example: 'MemberNick' })
  nickname: string;

  @ApiProperty({ example: ['USER'], enum: UserRole, isArray: true })
  roles: UserRole[];

  @ApiProperty({ example: 'MEMBER', nullable: true })
  squadRole: string | null;

  @ApiProperty({ type: PublicFileDto, nullable: true })
  avatar: PublicFileDto | null;
}

export class PublicSquadListItemDto {
  @ApiProperty({ example: '2a6d7b86-57b4-4ca4-8f87-6aab1fcd8c23' })
  id: string;

  @ApiProperty({ example: '1st Mechanized' })
  name: string;

  @ApiProperty({ example: '1MEC' })
  tag: string;

  @ApiProperty({
    description: 'Lexical editor JSON',
    example: PUBLIC_LEXICAL_JSON_EXAMPLE,
    nullable: true,
  })
  description: object | null;

  @ApiProperty({ example: 18 })
  activeCount: number;

  @ApiProperty({ example: '4c4d0611-9f81-4ffd-b4ce-c8fe8f7f3b8b' })
  leaderId: string;

  @ApiProperty({ nullable: true })
  telegramUrl: string | null;

  @ApiProperty({ nullable: true })
  discordUrl: string | null;

  @ApiProperty({ example: '2026-01-15T08:00:00.000Z' })
  createdAt: string;

  @ApiProperty({ example: '2026-09-20T10:00:00.000Z' })
  updatedAt: string;

  @ApiProperty({ type: PublicFileDto, nullable: true })
  logo: PublicFileDto | null;

  @ApiProperty({ type: PublicSquadLeaderDto })
  leader: PublicSquadLeaderDto;

  @ApiProperty({ type: PublicSideShortDto, nullable: true })
  side: PublicSideShortDto | null;

  @ApiProperty({ type: PublicSquadMemberCountDto })
  _count: PublicSquadMemberCountDto;
}

export class PublicSquadDetailDto extends PublicSquadListItemDto {
  @ApiProperty({ type: [PublicSquadMemberDto] })
  members: PublicSquadMemberDto[];
}

export class PublicSquadListResponseDto {
  @ApiProperty({ type: [PublicSquadListItemDto] })
  data: PublicSquadListItemDto[];

  @ApiProperty({ example: 15 })
  total: number;

  @ApiProperty({ example: 0 })
  skip: number;

  @ApiProperty({ example: 50 })
  take: number;
}
