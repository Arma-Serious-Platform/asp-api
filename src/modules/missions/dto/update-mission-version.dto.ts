import { ApiPropertyOptional } from "@nestjs/swagger";
import { MissionGameSide } from "@prisma/client";
import { IsArray, IsEnum, IsNumber, IsOptional, IsString, ValidateNested } from "class-validator";
import { CreateMissionWeaponryDto } from "./create-mission-weaponry.dto";
import { Type } from "class-transformer";

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
  attackSideSlots?: number;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
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
}