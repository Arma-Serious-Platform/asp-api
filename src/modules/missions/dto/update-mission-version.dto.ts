import { ApiPropertyOptional } from "@nestjs/swagger";
import { MissionGameSide, Prisma } from "@prisma/client";
import { IsArray, IsDateString, IsEnum, IsNumber, IsOptional, IsString, ValidateNested } from "class-validator";
import { CreateMissionWeaponryDto } from "./create-mission-weaponry.dto";
import { Transform, Type } from "class-transformer";
import { normalizeStringArray } from "src/utils/normalize-string-array";
import { normalizeObjectArray } from "src/utils/normalize-object-array";
import { normalizeJsonValue } from "src/utils/normalize-json-value";

export class UpdateMissionVersionDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  version?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  attackSideName?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  defenseSideName?: string;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  attackSideSlots?: number;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  defenseSideSlots?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => (value === '' || value === null ? null : Number(value)))
  @IsNumber()
  @Type(() => Number)
  minSlotsToPlay?: number | null;

  @ApiPropertyOptional()
  @IsEnum(MissionGameSide)
  @IsOptional()
  attackSideType?: MissionGameSide;

  @ApiPropertyOptional()
  @IsEnum(MissionGameSide)
  @IsOptional()
  defenseSideType?: MissionGameSide;

  @ApiPropertyOptional({ type: [CreateMissionWeaponryDto] })
  @IsOptional()
  @Transform(normalizeObjectArray)
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateMissionWeaponryDto)
  weaponry?: CreateMissionWeaponryDto[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @Transform(normalizeStringArray)
  @IsArray()
  @IsString({ each: true })
  removeAttackScreenshotIds?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @Transform(normalizeStringArray)
  @IsArray()
  @IsString({ each: true })
  removeDefenseScreenshotIds?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  inGameTime?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  weather?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(normalizeJsonValue)
  changelog?: Prisma.InputJsonValue;
}