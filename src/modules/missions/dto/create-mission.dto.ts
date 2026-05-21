import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { MissionType } from "@prisma/client";
import { Transform } from "class-transformer";
import { IsArray, IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from "class-validator";
import { normalizeStringArray } from "src/utils/normalize-string-array";

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

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @Transform(normalizeStringArray)
  @IsArray()
  @IsUUID('4', { each: true })
  coauthorIds?: string[];
}
