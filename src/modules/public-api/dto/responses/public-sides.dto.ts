import { ApiProperty } from '@nestjs/swagger';
import { SideType } from '@prisma/client';
import { PublicServerDto, PublicSquadShortDto } from './public-common.dto';

export class PublicSideDto {
  @ApiProperty({ example: '2a6d7b86-57b4-4ca4-8f87-6aab1fcd8c23' })
  id: string;

  @ApiProperty({ example: 'Blue Force' })
  name: string;

  @ApiProperty({ example: 'BLUE', enum: SideType })
  type: SideType;

  @ApiProperty({ example: '2026-01-10T08:00:00.000Z' })
  createdAt: string;

  @ApiProperty({ example: '2026-09-01T12:00:00.000Z' })
  updatedAt: string;

  @ApiProperty({ type: PublicServerDto, nullable: true })
  server: PublicServerDto | null;

  @ApiProperty({ type: [PublicSquadShortDto] })
  squads: PublicSquadShortDto[];
}

export class PublicSideListResponseDto {
  @ApiProperty({ type: [PublicSideDto] })
  data: PublicSideDto[];

  @ApiProperty({ example: 4 })
  total: number;

  @ApiProperty({ example: 0 })
  skip: number;

  @ApiProperty({ example: 50 })
  take: number;
}
