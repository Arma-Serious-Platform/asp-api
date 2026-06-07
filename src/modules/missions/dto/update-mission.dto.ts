import { ApiPropertyOptional } from "@nestjs/swagger";
import { MissionType, Prisma } from "@prisma/client";
import { Transform } from "class-transformer";
import { IsArray, IsEnum, IsOptional, IsString, IsUUID } from "class-validator";
import { normalizeStringArray } from "src/utils/normalize-string-array";
import { normalizeJsonValue } from "src/utils/normalize-json-value";

export class UpdateMissionDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(normalizeJsonValue)
  description?: Prisma.InputJsonValue;

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
