import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsNotEmpty, IsObject, IsOptional } from "class-validator";

export class UpdateMissionCommentDto {
  @ApiPropertyOptional({ type: 'object', description: 'Lexical JSON content' })
  @IsObject()
  @IsOptional()
  @IsNotEmpty()
  message?: any;
}
