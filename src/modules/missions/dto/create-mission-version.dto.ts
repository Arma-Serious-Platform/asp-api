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
  @Type(() => Number)
  attackSideSlots: number;

  @ApiProperty()
  @IsNumber()
  @IsNotEmpty()
  @Type(() => Number)
  defenseSideSlots: number;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  attackSideName: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  defenseSideName: string;

  @ApiPropertyOptional()
  @IsOptional()
  file?: File;

  @ApiPropertyOptional({ type: [CreateMissionWeaponryDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateMissionWeaponryDto)
  weaponry?: CreateMissionWeaponryDto[];
}