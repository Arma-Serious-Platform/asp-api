import { ApiPropertyOptional } from "@nestjs/swagger";
import { MissionStatus, MissionType } from "@prisma/client";
import { Transform } from "class-transformer";
import { IsEnum, IsInt, IsOptional, IsString, IsUUID, Max, Min } from "class-validator";
import { PaginationDto } from "src/shared/dto/pagination.dto";

export class FindMissionsDto extends PaginationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  authorId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  @Transform(({ value }) => parseInt(value as string))
  minSlots?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  @Transform(({ value }) => parseInt(value as string))
  maxSlots?: number;

  @ApiPropertyOptional({ enum: MissionStatus })
  @IsOptional()
  @IsEnum(MissionStatus)
  status?: MissionStatus;

  @ApiPropertyOptional({ enum: MissionType })
  @IsOptional()
  @IsEnum(MissionType)
  missionType?: MissionType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  islandId?: string;
}