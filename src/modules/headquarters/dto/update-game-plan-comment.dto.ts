import { ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsArray, IsObject, IsOptional, IsString, IsUUID } from "class-validator";
import { parseRemovedAttachmentIds } from "src/shared/utils/sync-comment-attachments";
import { normalizeJsonValue } from "src/utils/normalize-json-value";

export class UpdateGamePlanCommentDto {
  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: true,
    description: 'Updated rich text JSON payload for game plan comment',
    example: {
      root: {
        children: [
          {
            type: 'paragraph',
            children: [{ type: 'text', text: 'Updated plan details for this slot', version: 1 }],
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
  message?: any;

  @ApiPropertyOptional({
    example: null,
    nullable: true,
    description: 'Reply target comment id or null to clear reply',
  })
  @IsOptional()
  @IsString()
  replyId?: string | null;

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
