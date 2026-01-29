import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsBoolean } from "class-validator";
import { Transform } from "class-transformer";
import { PaginationDto } from "src/shared/dto/pagination.dto";

export class FindWeekendsDto extends PaginationDto {
  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === "true" || value === true)
  published?: boolean;
}
