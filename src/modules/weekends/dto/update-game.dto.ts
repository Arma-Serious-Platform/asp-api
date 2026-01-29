import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, IsInt, Min } from "class-validator";

export class UpdateGameDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  date?: string; // ISO date string

  @ApiPropertyOptional()
  @IsInt()
  @Min(0)
  @IsOptional()
  position?: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  missionId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  attackSideId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  defenseSideId?: string;
}
