import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsObject, IsOptional, IsUUID } from "class-validator";

export class CreateMissionCommentDto {
  @ApiProperty({
    required: true,
    description: 'Lexical JSON content',
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
  @IsObject()
  @IsNotEmpty()
  message: any;

  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  @IsUUID()
  @IsNotEmpty()
  missionId: string;

  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  @IsUUID()
  @IsOptional()
  replyId?: string;
}
