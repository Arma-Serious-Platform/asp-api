import { ApiProperty } from '@nestjs/swagger';
import { SideType } from '@prisma/client';

export class PublicFileDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  id: string;

  @ApiProperty({ example: 'https://cdn.example.com/files/avatar.jpg' })
  url: string;

  @ApiProperty({ example: 'avatar.jpg', required: false })
  filename?: string;
}

export class PublicSideShortDto {
  @ApiProperty({ example: '2a6d7b86-57b4-4ca4-8f87-6aab1fcd8c23' })
  id: string;

  @ApiProperty({ example: 'Blue Force' })
  name: string;

  @ApiProperty({ example: 'BLUE', enum: SideType })
  type: SideType;
}

export class PublicAuthorDto {
  @ApiProperty({ example: '4c4d0611-9f81-4ffd-b4ce-c8fe8f7f3b8b' })
  id: string;

  @ApiProperty({ example: 'MissionMaker' })
  nickname: string;
}

export class PublicIslandDto {
  @ApiProperty({ example: 'f3e2d1c0-b9a8-7654-3210-fedcba987654' })
  id: string;

  @ApiProperty({ example: 'Altis' })
  name: string;

  @ApiProperty({ example: 'ALTIS' })
  code: string;
}

export class PublicServerDto {
  @ApiProperty({ example: 'e1d2c3b4-a5f6-7890-abcd-ef1234567891' })
  id: string;

  @ApiProperty({ example: 'ASP Main' })
  name: string;

  @ApiProperty({ example: 'ACTIVE' })
  status: string;
}

export class PublicSquadShortDto {
  @ApiProperty({ example: '2a6d7b86-57b4-4ca4-8f87-6aab1fcd8c23' })
  id: string;

  @ApiProperty({ example: '1st Mechanized' })
  name: string;

  @ApiProperty({ example: '1MEC' })
  tag: string;
}

const lexicalContentExample = {
  root: {
    children: [
      {
        type: 'paragraph',
        children: [{ type: 'text', text: 'Sample content.', version: 1 }],
        version: 1,
      },
    ],
    direction: null,
    format: '',
    indent: 0,
    type: 'root',
    version: 1,
  },
};

export const PUBLIC_LEXICAL_JSON_EXAMPLE = lexicalContentExample;

const missionSlotExample = [
  {
    slotNumber: 'Alpha 1-1',
    name: 'Mechanized Infantry',
    weaponry: '2x IFV',
    position: 0,
    slotCount: 12,
    missionGameSide: 'BLUE',
  },
];

export const PUBLIC_MISSION_SLOTS_JSON_EXAMPLE = missionSlotExample;
