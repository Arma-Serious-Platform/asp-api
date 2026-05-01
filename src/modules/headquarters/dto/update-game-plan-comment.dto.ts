import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsObject, IsOptional, IsString } from "class-validator";

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
}
