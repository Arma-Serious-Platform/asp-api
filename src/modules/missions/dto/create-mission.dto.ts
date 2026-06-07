import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { MissionType, Prisma } from "@prisma/client";
import { Transform } from "class-transformer";
import { IsArray, IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from "class-validator";
import { normalizeStringArray } from "src/utils/normalize-string-array";
import { normalizeJsonValue } from "src/utils/normalize-json-value";

export class CreateMissionDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(normalizeJsonValue)
  description?: Prisma.InputJsonValue;

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
