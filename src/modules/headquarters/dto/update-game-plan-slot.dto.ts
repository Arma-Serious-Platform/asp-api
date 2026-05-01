import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";

export class UpdateGamePlanSlotDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  weaponry?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  comment?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  spawnPoint?: string | null;
}
