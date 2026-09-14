import { ApiPropertyOptional } from '@nestjs/swagger';
import { NewsType } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsOptional,
  IsUUID,
} from 'class-validator';
import { PaginationDto } from 'src/shared/dto/pagination.dto';

export class FindNewsDto extends PaginationDto {
  @ApiPropertyOptional({ enum: NewsType })
  @IsOptional()
  @IsEnum(NewsType)
  type?: NewsType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  authorId?: string;

  @ApiPropertyOptional({ description: 'Inclusive date range start (ISO)' })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({ description: 'Inclusive date range end (ISO)' })
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @ApiPropertyOptional({
    description: 'Admin only: filter by published status',
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }
    return value === 'true' || value === true;
  })
  @IsBoolean()
  published?: boolean;
}
