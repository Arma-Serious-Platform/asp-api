import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsArray, IsNotEmpty, IsObject, IsOptional, IsUUID } from 'class-validator';
import { parseRemovedAttachmentIds } from 'src/shared/utils/sync-comment-attachments';
import { normalizeJsonValue } from 'src/utils/normalize-json-value';

export class UpdateMessageDto {
  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: true,
    description: 'Updated Lexical JSON content',
  })
  @Transform(normalizeJsonValue)
  @IsObject()
  @IsOptional()
  @IsNotEmpty()
  content?: any;

  @ApiPropertyOptional({
    type: [String],
    description: 'Attachment ids to remove from the message',
  })
  @Transform(({ value }) => parseRemovedAttachmentIds(value))
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  removedAttachmentIds?: string[];
}
