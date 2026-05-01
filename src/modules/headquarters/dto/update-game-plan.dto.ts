import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";

export class UpdateGamePlanDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  planUrl?: string | null;
}
