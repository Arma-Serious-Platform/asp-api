import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, IsInt, Min, ValidateIf } from "class-validator";

export class UpdateGameDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  date?: string; // ISO date string

  @ApiPropertyOptional()
  @IsInt()
  @Min(0)
  @IsOptional()
  position?: number;

  @ApiPropertyOptional({ description: 'Mission id – when changing mission/version, both missionId and missionVersionId must be provided' })
  @IsString()
  @IsOptional()
  missionId?: string;

  @ApiPropertyOptional({ description: 'Mission version id – must belong to the selected mission' })
  @IsString()
  @IsOptional()
  missionVersionId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  attackSideId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  defenseSideId?: string;

  @ApiPropertyOptional({ description: 'User id of the game admin (optional, null to clear)' })
  @IsOptional()
  @ValidateIf((_, v) => v != null)
  @IsString()
  adminId?: string | null;
}
