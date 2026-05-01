import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsObject, IsOptional, IsString } from "class-validator";

export class UpdateGamePlanCommentDto {
  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  @IsObject()
  @IsOptional()
  message?: any;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  replyId?: string | null;
}
