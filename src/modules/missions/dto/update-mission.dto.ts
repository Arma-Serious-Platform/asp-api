import { ApiPropertyOptional } from "@nestjs/swagger";
import { MissionType } from "@prisma/client";
import { IsEnum, IsOptional, IsString, IsUUID } from "class-validator";

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
}