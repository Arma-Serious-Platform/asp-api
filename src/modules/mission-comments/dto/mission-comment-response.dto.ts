import { ApiProperty } from '@nestjs/swagger';

class MissionCommentUserAvatarDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  id: string;

  @ApiProperty({ example: 'https://cdn.example.com/avatars/abc.jpg' })
  url: string;
}

class MissionCommentUserDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  id: string;

  @ApiProperty({ example: 'PlayerOne' })
  nickname: string;

  @ApiProperty({ type: MissionCommentUserAvatarDto, nullable: true })
  avatar: { id: string; url: string } | null;
}

class MissionCommentMissionDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  id: string;

  @ApiProperty({ example: 'Operation Dawn' })
  name: string;
}

export class MissionCommentResponseDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  id: string;

  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  missionId: string;

  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  userId: string;

  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', nullable: true })
  replyId: string | null;

  @ApiProperty({
    description: 'Lexical editor JSON content',
    example: {
      root: {
        children: [
          {
            type: 'paragraph',
            children: [{ type: 'text', text: 'Great mission!', version: 1 }],
            version: 1,
          },
        ],
        direction: null,
        format: '',
        indent: 0,
        type: 'root',
        version: 1,
      },
    },
  })
  message: object;

  @ApiProperty({ example: '2025-03-14T12:00:00.000Z' })
  createdAt: string;

  @ApiProperty({ example: '2025-03-14T12:00:00.000Z' })
  updatedAt: string;

  @ApiProperty({ type: MissionCommentUserDto })
  user: MissionCommentUserDto;

  @ApiProperty({ type: MissionCommentMissionDto, required: false })
  mission?: MissionCommentMissionDto;
}

export class MissionCommentListResponseDto {
  @ApiProperty({ type: [MissionCommentResponseDto] })
  data: MissionCommentResponseDto[];

  @ApiProperty({ example: 42 })
  total: number;
}

export class MissionCommentDeletedResponseDto {
  @ApiProperty({ example: 'Comment deleted successfully' })
  message: string;
}
