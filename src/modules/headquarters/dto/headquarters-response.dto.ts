import { ApiProperty } from "@nestjs/swagger";

class HeadquartersSquadShortDto {
  @ApiProperty({ example: '2a6d7b86-57b4-4ca4-8f87-6aab1fcd8c23' })
  id: string;

  @ApiProperty({ example: '1st Mechanized' })
  name: string;

  @ApiProperty({ example: '1MEC' })
  tag: string;

  @ApiProperty({ nullable: true })
  logo?: {
    id: string;
    url: string;
  } | null;
}

class HeadquartersCommanderDto {
  @ApiProperty({ example: '4c4d0611-9f81-4ffd-b4ce-c8fe8f7f3b8b' })
  id: string;

  @ApiProperty({ example: 'CommanderNick' })
  nickname: string;

  @ApiProperty({ example: 'USER' })
  role: string;

  @ApiProperty({ example: 'LEADER', nullable: true })
  squadRole: string | null;

  @ApiProperty({ example: false })
  isMissionReviewer: boolean;

  @ApiProperty({ nullable: true })
  avatar?: {
    id: string;
    url: string;
  } | null;

  @ApiProperty({ nullable: true })
  squad?: {
    id: string;
    tag: string;
    side?: {
      type: string;
    };
  } | null;
}

export class HeadquartersSlotResponseDto {
  @ApiProperty({ example: '4f8ad6f3-7eb0-4711-84d7-bf9f1ec7609a' })
  id: string;

  @ApiProperty({ example: 'Alpha 1-1' })
  slotNumber: string;

  @ApiProperty({ example: 'Mechanized Infantry', nullable: true })
  name: string | null;

  @ApiProperty({ example: '2x IFV, 1x logistics truck', nullable: true })
  weaponry: string | null;

  @ApiProperty({ example: 12, nullable: true })
  slotCount: number | null;

  @ApiProperty({ example: 'Need experienced crew and comms discipline', nullable: true })
  comment: string | null;

  @ApiProperty({ example: 'FOB North', nullable: true })
  spawnPoint: string | null;

  @ApiProperty({ type: [HeadquartersSquadShortDto] })
  assignedSquads: HeadquartersSquadShortDto[];

  @ApiProperty({ type: [HeadquartersSquadShortDto] })
  wantedSquads: HeadquartersSquadShortDto[];
}

class HeadquartersGameShortDto {
  @ApiProperty({ example: '36f32f12-dc69-4ad0-b0fb-d95d95bb4ce6' })
  id: string;

  @ApiProperty({ example: '2026-05-03T17:00:00.000Z' })
  date: string;

  @ApiProperty({ example: 1 })
  position: number;
}

class HeadquartersSideShortDto {
  @ApiProperty({ example: '92fcf7a9-d154-4ad0-a1d8-500f49810006' })
  id: string;

  @ApiProperty({ example: 'Bluefor' })
  name: string;

  @ApiProperty({ example: 'BLUE' })
  type: string;
}

export class HeadquartersGamePlanResponseDto {
  @ApiProperty({ example: '6a74e1ae-bd8d-46ec-9956-2cf68ddf2bb8' })
  id: string;

  @ApiProperty({ example: '36f32f12-dc69-4ad0-b0fb-d95d95bb4ce6' })
  gameId: string;

  @ApiProperty({ example: 'https://drive.google.com/file/d/123456789/view', nullable: true })
  planUrl: string | null;

  @ApiProperty({ example: '4c4d0611-9f81-4ffd-b4ce-c8fe8f7f3b8b', nullable: true })
  gameCommanderId: string | null;

  @ApiProperty({ example: '2a6d7b86-57b4-4ca4-8f87-6aab1fcd8c23', nullable: true })
  hqSquadId: string | null;

  @ApiProperty({ type: HeadquartersCommanderDto, nullable: true })
  gameCommander?: HeadquartersCommanderDto | null;

  @ApiProperty({ type: HeadquartersSquadShortDto, nullable: true })
  hqSquad?: HeadquartersSquadShortDto | null;

  @ApiProperty({ type: HeadquartersGameShortDto })
  game: HeadquartersGameShortDto;

  @ApiProperty({ type: HeadquartersSideShortDto })
  side: HeadquartersSideShortDto;

  @ApiProperty({ type: [HeadquartersSlotResponseDto] })
  slots: HeadquartersSlotResponseDto[];
}

export class HeadquartersGamePlanListResponseDto {
  @ApiProperty({ type: [HeadquartersGamePlanResponseDto] })
  data: HeadquartersGamePlanResponseDto[];
}
