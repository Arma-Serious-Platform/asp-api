import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { MissionGameSide, Prisma } from "@prisma/client";
import { Transform, Type } from "class-transformer";
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from "class-validator";
import { CreateMissionWeaponryDto } from "./create-mission-weaponry.dto";
import { normalizeObjectArray } from "src/utils/normalize-object-array";
import { normalizeJsonValue } from "src/utils/normalize-json-value";

export class CreateMissionVersionDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  version: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  missionId: string;

  @ApiProperty({ enum: MissionGameSide })
  @IsEnum(MissionGameSide)
  @IsNotEmpty()
  attackSideType: MissionGameSide;

  @ApiProperty({ enum: MissionGameSide })
  @IsEnum(MissionGameSide)
  @IsNotEmpty()
  defenseSideType: MissionGameSide;

  @ApiProperty()
  @IsNumber()
  @IsNotEmpty()
  @Type(() => Number)
  attackSideSlots: number;

  @ApiProperty()
  @IsNumber()
  @IsNotEmpty()
  @Type(() => Number)
  defenseSideSlots: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  minSlotsToPlay?: number;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  attackSideName: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  defenseSideName: string;

  @ApiPropertyOptional({ enum: MissionGameSide })
  @IsOptional()
  @IsEnum(MissionGameSide)
  friendlySideType?: MissionGameSide;

  @ApiPropertyOptional({ enum: MissionGameSide })
  @IsOptional()
  @IsEnum(MissionGameSide)
  friendlyTo?: MissionGameSide;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  friendlySideName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  friendlySideSlots?: number;

  @ApiPropertyOptional()
  @IsOptional()
  file?: File;

  @ApiPropertyOptional({ type: [CreateMissionWeaponryDto] })
  @IsOptional()
  @Transform(normalizeObjectArray)
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateMissionWeaponryDto)
  weaponry?: CreateMissionWeaponryDto[];

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
