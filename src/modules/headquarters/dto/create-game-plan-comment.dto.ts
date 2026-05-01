import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsNotEmpty, IsObject, IsOptional, IsString } from "class-validator";

export class CreateGamePlanCommentDto {
  @ApiProperty({ type: 'object', additionalProperties: true })
  @IsObject()
  @IsNotEmpty()
  message: any;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  replyId?: string;
}
