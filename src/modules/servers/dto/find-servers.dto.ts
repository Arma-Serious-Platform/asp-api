import { Optional } from "@nestjs/common";
import { ApiPropertyOptional } from "@nestjs/swagger";
import { ServerStatus } from "@prisma/client";
import { Transform } from "class-transformer";
import { IsBoolean, IsEnum } from "class-validator";
import { PaginationDto } from "src/shared/dto/pagination.dto";

export class FindServersDto extends PaginationDto {
  @ApiPropertyOptional()
  @Optional()
  @IsEnum(ServerStatus)
  status?: ServerStatus;

  @ApiPropertyOptional()
  @Optional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  fetchActualInfo?: boolean;
}