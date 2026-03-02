import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { MissionType } from "@prisma/client";
import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from "class-validator";

export class CreateMissionDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiPropertyOptional({ enum: MissionType, default: MissionType.SG })
  @IsEnum(MissionType)
  @IsOptional()
  missionType?: MissionType;

  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  islandId: string;
}