import { ApiPropertyOptional } from "@nestjs/swagger";
import { MissionStatus } from "@prisma/client";
import { Transform } from "class-transformer";
import { IsEnum, IsInt, IsOptional, IsString, IsUUID, Max, Min } from "class-validator";
import { PaginationDto } from "src/shared/dto/pagination.dto";

export class FindMissionsDto extends PaginationDto {
  @IsOptional()
  @IsUUID()
  authorId?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Transform(({ value }) => parseInt(value as string))
  minSlots?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Transform(({ value }) => parseInt(value as string))
  maxSlots?: number;

  @IsOptional()
  @IsEnum(MissionStatus)
  status?: MissionStatus;

  @IsOptional()
  @IsUUID()
  islandId?: string;
}