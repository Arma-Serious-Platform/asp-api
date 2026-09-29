import { ApiProperty } from '@nestjs/swagger';
import { PublicSideShortDto } from './public-common.dto';

class PublicWeekendMissionStubDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  id: string;

  @ApiProperty({ example: 'Operation Dawn' })
  name: string;
}

class PublicWeekendGameMissionVersionDto {
  @ApiProperty({ example: 'b2c3d4e5-f6a7-8901-bcde-f12345678901' })
  id: string;

  @ApiProperty({ example: 3 })
  version: number;

  @ApiProperty({ example: 'Blue Force', nullable: true })
  attackSideName: string | null;

  @ApiProperty({ example: 'Red Force', nullable: true })
  defenseSideName: string | null;

  @ApiProperty({ example: null, nullable: true })
  friendlySideName: string | null;

  @ApiProperty({ example: 'BLUE', nullable: true })
  attackSideType: string | null;

  @ApiProperty({ example: 'RED', nullable: true })
  defenseSideType: string | null;

  @ApiProperty({ example: 48, nullable: true })
  attackSideSlots: number | null;

  @ApiProperty({ example: 48, nullable: true })
  defenseSideSlots: number | null;

  @ApiProperty({ type: PublicWeekendMissionStubDto })
  mission: PublicWeekendMissionStubDto;
}

class PublicWeekendGameDto {
  @ApiProperty({ example: 'c3d4e5f6-a7b8-9012-cdef-123456789012' })
  id: string;

  @ApiProperty({ example: '2026-10-04T18:00:00.000Z' })
  date: string;

  @ApiProperty({ example: 0 })
  position: number;

  @ApiProperty({ type: PublicWeekendMissionStubDto })
  mission: PublicWeekendMissionStubDto;

  @ApiProperty({ type: PublicWeekendGameMissionVersionDto })
  missionVersion: PublicWeekendGameMissionVersionDto;

  @ApiProperty({ type: PublicSideShortDto, nullable: true })
  attackSide: PublicSideShortDto | null;

  @ApiProperty({ type: PublicSideShortDto, nullable: true })
  defenseSide: PublicSideShortDto | null;
}

export class PublicWeekendDto {
  @ApiProperty({ example: 'd4e5f6a7-b8c9-0123-def0-234567890123' })
  id: string;

  @ApiProperty({ example: 'Weekend #42' })
  name: string;

  @ApiProperty({ example: 'Main event schedule', nullable: true })
  description: string | null;

  @ApiProperty({ example: true })
  published: boolean;

  @ApiProperty({ example: '2026-09-28T12:00:00.000Z', nullable: true })
  publishedAt: string | null;

  @ApiProperty({ example: '2026-09-20T10:00:00.000Z' })
  createdAt: string;

  @ApiProperty({ example: '2026-09-28T12:00:00.000Z' })
  updatedAt: string;

  @ApiProperty({ type: [PublicWeekendGameDto] })
  games: PublicWeekendGameDto[];
}

export class PublicWeekendListResponseDto {
  @ApiProperty({ type: [PublicWeekendDto] })
  data: PublicWeekendDto[];

  @ApiProperty({ example: 12 })
  total: number;

  @ApiProperty({ example: 0 })
  skip: number;

  @ApiProperty({ example: 50 })
  take: number;
}
