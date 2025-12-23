import { ApiPropertyOptional } from "@nestjs/swagger";
import { MissionStatus } from "@prisma/client";
import { IsEnum, IsInt, IsOptional, IsString, IsUUID, Max, Min } from "class-validator";
import { PaginationDto } from "src/shared/dto/pagination.dto";

export class FindMissionsDto extends PaginationDto {
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