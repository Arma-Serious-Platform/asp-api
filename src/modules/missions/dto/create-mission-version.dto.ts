import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { MissionGameSide } from "@prisma/client";
import { Type } from "class-transformer";
import { IsArray, IsDefined, IsNotEmpty, IsNumber, IsOptional, IsString, ValidateNested } from "class-validator";
import { CreateMissionWeaponryDto } from "./create-mission-weaponry.dto";

export class CreateMissionVersionDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  version: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  missionId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  attackSideType: MissionGameSide;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  defenseSideType: MissionGameSide;

  @ApiProperty()
  @IsNumber()
  @IsNotEmpty()
  attackSideSlots: number;

  @ApiProperty()
  @IsNumber()
  @IsNotEmpty()
  defenseSideSlots: number;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  attackSideName: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  defenseSideName: string;

  @ApiProperty()
  @IsDefined()
  @IsNotEmpty()
  @Type(() => File)
  file: File;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  rating?: number;

  @ApiPropertyOptional({ type: [CreateMissionWeaponryDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateMissionWeaponryDto)
  attackSideWeaponry?: CreateMissionWeaponryDto[];

  @ApiPropertyOptional({ type: [CreateMissionWeaponryDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateMissionWeaponryDto)
  defenseSideWeaponry?: CreateMissionWeaponryDto[];
}