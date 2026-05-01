import { ApiPropertyOptional } from "@nestjs/swagger";
import { MissionGameSide } from "@prisma/client";
import { IsArray, IsEnum, IsNumber, IsOptional, IsString, ValidateNested } from "class-validator";
import { CreateMissionWeaponryDto } from "./create-mission-weaponry.dto";
import { Transform, Type } from "class-transformer";

const normalizeStringArray = ({ value }: { value: unknown }) => {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return [];
    }

    if (trimmed.startsWith("[")) {
      try {
        const parsed = JSON.parse(trimmed);
        return Array.isArray(parsed) ? parsed : [trimmed];
      } catch {
        return [trimmed];
      }
    }

    return trimmed.split(",").map((item) => item.trim()).filter(Boolean);
  }

  return [String(value)];
};

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
  @IsEnum(MissionGameSide)
  @IsOptional()
  attackSideType?: MissionGameSide;

  @ApiPropertyOptional()
  @IsEnum(MissionGameSide)
  @IsOptional()
  defenseSideType?: MissionGameSide;

  @ApiPropertyOptional({ type: [CreateMissionWeaponryDto] })
  @IsOptional()
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
}