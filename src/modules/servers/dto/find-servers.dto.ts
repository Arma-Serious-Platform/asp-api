import { Optional } from "@nestjs/common";
import { ApiPropertyOptional } from "@nestjs/swagger";
import { ServerStatus } from "@prisma/client";
import { IsEnum } from "class-validator";
import { PaginationDto } from "src/shared/dto/pagination.dto";

export class FindServersDto extends PaginationDto {
  @ApiPropertyOptional()
  @Optional()
  @IsEnum(ServerStatus)
  status?: ServerStatus;
}