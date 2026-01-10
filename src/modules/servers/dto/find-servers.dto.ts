import { ApiPropertyOptional } from "@nestjs/swagger";
import { ServerStatus } from "@prisma/client";
import { Transform } from "class-transformer";
import { IsBoolean, IsEnum, IsOptional } from "class-validator";
import { PaginationDto } from "src/shared/dto/pagination.dto";

export class FindServersDto extends PaginationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsEnum(ServerStatus)
  status?: ServerStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  fetchActualInfo?: boolean;
}