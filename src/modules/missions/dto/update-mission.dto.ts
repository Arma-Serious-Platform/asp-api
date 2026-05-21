import { ApiPropertyOptional } from "@nestjs/swagger";
import { MissionType } from "@prisma/client";
import { Transform } from "class-transformer";
import { IsArray, IsEnum, IsOptional, IsString, IsUUID } from "class-validator";
import { normalizeStringArray } from "src/utils/normalize-string-array";

export class UpdateMissionDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ enum: MissionType })
  @IsEnum(MissionType)
  @IsOptional()
  missionType?: MissionType;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  islandId?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @Transform(normalizeStringArray)
  @IsArray()
  @IsUUID('4', { each: true })
  coauthorIds?: string[];
}
