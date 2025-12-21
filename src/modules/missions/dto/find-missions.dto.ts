import { ApiPropertyOptional } from "@nestjs/swagger";
import { MissionStatus } from "@prisma/client";
import { IsEnum, IsInt, IsOptional, IsString, IsUUID, Max, Min } from "class-validator";

export class FindMissionsDto {
  @IsString()
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsUUID()
  authorId?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  minSlots?: number;

  @IsOptional()
  @IsInt()
  @Max(100)
  maxSlots?: number;

  @IsOptional()
  @IsEnum(MissionStatus)
  status?: MissionStatus;
}