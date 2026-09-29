import { ApiProperty } from '@nestjs/swagger';
import { MissionObjective, MissionType, State } from '@prisma/client';
import {
  PUBLIC_LEXICAL_JSON_EXAMPLE,
  PUBLIC_MISSION_SLOTS_JSON_EXAMPLE,
  PublicAuthorDto,
  PublicFileDto,
  PublicIslandDto,
} from './public-common.dto';

class PublicUniformScreenshotDto {
  @ApiProperty({ example: 'BLUE' })
  side: string;

  @ApiProperty({ type: PublicFileDto })
  file: PublicFileDto;
}

export class PublicMissionVersionDto {
  @ApiProperty({ example: 'b2c3d4e5-f6a7-8901-bcde-f12345678901' })
  id: string;

  @ApiProperty({ example: 3 })
  version: number;

  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  missionId: string;

  @ApiProperty({ example: 'PUBLISHED' })
  status: string;

  @ApiProperty({ example: 'BLUE', nullable: true })
  attackSideType: string | null;

  @ApiProperty({ example: 'RED', nullable: true })
  defenseSideType: string | null;

  @ApiProperty({ example: null, nullable: true })
  friendlySideType: string | null;

  @ApiProperty({ nullable: true })
  friendlyTo: string | null;

  @ApiProperty({ example: 48, nullable: true })
  attackSideSlots: number | null;

  @ApiProperty({ example: 48, nullable: true })
  defenseSideSlots: number | null;

  @ApiProperty({ example: null, nullable: true })
  friendlySideSlots: number | null;

  @ApiProperty({ example: 20, nullable: true })
  minSlotsToPlay: number | null;

  @ApiProperty({ example: 'Blue Force', nullable: true })
  attackSideName: string | null;

  @ApiProperty({ example: 'Red Force', nullable: true })
  defenseSideName: string | null;

  @ApiProperty({ nullable: true })
  friendlySideName: string | null;

  @ApiProperty({ nullable: true })
  changesDescription: string | null;

  @ApiProperty({ example: '12:00', nullable: true })
  inGameTime: string | null;

  @ApiProperty({ nullable: true })
  weather: string | null;

  @ApiProperty({ nullable: true })
  weaponry: string | null;

  @ApiProperty({ example: 4.5, nullable: true })
  rating: number | null;

  @ApiProperty({ nullable: true })
  fileId: string | null;

  @ApiProperty({ example: '2026-08-01T10:00:00.000Z' })
  createdAt: string;

  @ApiProperty({ example: '2026-09-15T14:00:00.000Z' })
  updatedAt: string;

  @ApiProperty({
    type: PublicFileDto,
    nullable: true,
    example: {
      id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      url: 'https://cdn.example.com/missions/op-dawn.sqm',
      filename: 'mission.sqm',
    },
  })
  file: PublicFileDto | null;

  @ApiProperty({ type: [PublicUniformScreenshotDto] })
  uniformScreenshots: PublicUniformScreenshotDto[];

  @ApiProperty({
    description: 'Slot layout JSON',
    example: PUBLIC_MISSION_SLOTS_JSON_EXAMPLE,
    nullable: true,
  })
  missionAttackSlots?: object | null;

  @ApiProperty({
    description: 'Slot layout JSON',
    example: PUBLIC_MISSION_SLOTS_JSON_EXAMPLE,
    nullable: true,
  })
  missionDefenceSlots?: object | null;

  @ApiProperty({
    description: 'Slot layout JSON',
    example: PUBLIC_MISSION_SLOTS_JSON_EXAMPLE,
    nullable: true,
  })
  missionFriendlySlots?: object | null;

  @ApiProperty({
    required: false,
    description: 'Present on version detail endpoint',
    example: { id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', name: 'Operation Dawn' },
  })
  mission?: { id: string; name: string };
}

export class PublicMissionListItemDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  id: string;

  @ApiProperty({ example: 'Operation Dawn' })
  name: string;

  @ApiProperty({ example: 'SG', enum: MissionType })
  missionType: MissionType;

  @ApiProperty({ example: 'ATTACK_DEFEND', enum: MissionObjective })
  missionObjective: MissionObjective;

  @ApiProperty({ example: 'ACTIVE', enum: State })
  state: State;

  @ApiProperty({ example: '2026-07-01T08:00:00.000Z' })
  createdAt: string;

  @ApiProperty({ example: '2026-09-10T12:00:00.000Z' })
  updatedAt: string;

  @ApiProperty({ type: PublicFileDto, nullable: true })
  image: PublicFileDto | null;

  @ApiProperty({ type: PublicIslandDto, nullable: true })
  island: PublicIslandDto | null;

  @ApiProperty({ type: PublicAuthorDto, nullable: true })
  author: PublicAuthorDto | null;

  @ApiProperty({ type: [PublicMissionVersionDto] })
  missionVersions: PublicMissionVersionDto[];
}

export class PublicMissionDetailDto extends PublicMissionListItemDto {
  @ApiProperty({
    description: 'Lexical editor JSON',
    example: PUBLIC_LEXICAL_JSON_EXAMPLE,
    nullable: true,
  })
  description: object | null;

  @ApiProperty({ type: [PublicAuthorDto] })
  coauthors: PublicAuthorDto[];
}

export class PublicMissionListResponseDto {
  @ApiProperty({ type: [PublicMissionListItemDto] })
  data: PublicMissionListItemDto[];

  @ApiProperty({ example: 200 })
  total: number;

  @ApiProperty({ example: 0 })
  skip: number;

  @ApiProperty({ example: 100 })
  take: number;
}

export class PublicMissionVersionSlotsResponseDto {
  @ApiProperty({ example: 'b2c3d4e5-f6a7-8901-bcde-f12345678901' })
  id: string;

  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  missionId: string;

  @ApiProperty({
    description: 'Attack side slot layout',
    example: PUBLIC_MISSION_SLOTS_JSON_EXAMPLE,
    nullable: true,
  })
  attack: object | null;

  @ApiProperty({
    description: 'Defense side slot layout',
    example: PUBLIC_MISSION_SLOTS_JSON_EXAMPLE,
    nullable: true,
  })
  defense: object | null;

  @ApiProperty({
    description: 'Friendly side slot layout',
    example: PUBLIC_MISSION_SLOTS_JSON_EXAMPLE,
    nullable: true,
  })
  friendly: object | null;
}
