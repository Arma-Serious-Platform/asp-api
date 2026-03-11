import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsInt, IsOptional, IsUUID, Min } from "class-validator";
import { Type } from "class-transformer";
import { PaginationDto } from "src/shared/dto/pagination.dto";

export class FindMessagesDto extends PaginationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  chatId?: string;
}
