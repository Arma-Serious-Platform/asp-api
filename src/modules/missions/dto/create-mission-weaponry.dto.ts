import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { MissionGameSide } from "@prisma/client";
import { Type } from "class-transformer";
import { IsDefined, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, ValidateNested } from "class-validator";

export class CreateMissionWeaponryDto {
  @ApiProperty()
  @IsDefined()
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty()
  @IsDefined()
  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  count: number;

  @ApiProperty()
  @IsDefined()
  @IsNotEmpty()
  @IsEnum(MissionGameSide)
  type: MissionGameSide;
}

