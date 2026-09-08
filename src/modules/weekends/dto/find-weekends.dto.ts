import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsBoolean, IsUUID, IsDateString, IsArray } from "class-validator";
import { Transform } from "class-transformer";
import { PaginationDto } from "src/shared/dto/pagination.dto";
import { normalizeStringArray } from "src/utils/normalize-string-array";

export class FindWeekendsDto extends PaginationDto {
  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }
    return value === 'true' || value === true;
  })
  published?: boolean;

  @ApiPropertyOptional({
    type: [String],
    description: 'Filter weekends that have a game with any of these missions',
  })
  @IsOptional()
  @Transform(normalizeStringArray)
  @IsArray()
  @IsUUID(undefined, { each: true })
  missionIds?: string[];

  @ApiPropertyOptional({
    description: 'Filter weekends that have a game with this HQ squad (attack or defense)',
  })
  @IsOptional()
  @IsUUID()
  hqSquadId?: string;

  @ApiPropertyOptional({ description: 'Filter weekends that have a game with this admin' })
  @IsOptional()
  @IsUUID()
  adminId?: string;

  @ApiPropertyOptional({ description: 'Inclusive game date range start (ISO date)' })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({ description: 'Inclusive game date range end (ISO date)' })
  @IsOptional()
  @IsDateString()
  dateTo?: string;
}
