import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsNotEmpty, IsObject, IsOptional, IsString } from "class-validator";
import { normalizeJsonValue } from "src/utils/normalize-json-value";

export class CreateGamePlanCommentDto {
  @ApiProperty({
    type: 'object',
    additionalProperties: true,
    description: 'Rich text JSON payload for game plan comment',
    example: {
      root: {
        children: [
          {
            type: 'paragraph',
            children: [{ type: 'text', text: 'Take this slot with mechanized setup', version: 1 }],
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
  @IsNotEmpty()
  message: any;

  @ApiPropertyOptional({
    example: '8f147f45-56f0-4bb4-a88d-eaf2be3f3437',
    description: 'Optional reply target comment id in the same game plan',
  })
  @IsOptional()
  @IsString()
  replyId?: string;
}
