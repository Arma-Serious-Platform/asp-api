import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsArray, IsNotEmpty, IsObject, IsOptional, IsUUID, ValidateIf } from 'class-validator';
import { parseRemovedAttachmentIds } from 'src/shared/utils/sync-comment-attachments';
import { normalizeJsonValue } from 'src/utils/normalize-json-value';

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
  @Transform(normalizeJsonValue)
  @IsObject()
  @IsOptional()
  @IsNotEmpty()
  message?: any;

  @ApiPropertyOptional({
    type: [String],
    description: 'Attachment ids to remove from the comment',
  })
  @Transform(({ value }) => parseRemovedAttachmentIds(value))
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  removedAttachmentIds?: string[];
}
