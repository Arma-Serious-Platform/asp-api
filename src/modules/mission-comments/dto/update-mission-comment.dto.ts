import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsObject, IsOptional, IsUUID, ValidateIf } from 'class-validator';

export class UpdateMissionCommentDto {
  @ApiPropertyOptional({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', description: 'ID of comment this replies to (null to clear)' })
  @IsOptional()
  @ValidateIf((_, v) => v != null)
  @IsUUID()
  replyId?: string | null;

  @ApiPropertyOptional({
    type: 'object',
    description: 'Lexical JSON content',
    additionalProperties: true,
    example: {
      root: {
        children: [
          {
            type: 'paragraph',
            children: [{ type: 'text', text: 'Updated comment text.', version: 1 }],
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
  @IsOptional()
  @IsNotEmpty()
  message?: any;
}
