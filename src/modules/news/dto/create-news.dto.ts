import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NewsType } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';
import { normalizeJsonValue } from 'src/utils/normalize-json-value';

export class CreateNewsDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({ description: 'Lexical JSON content' })
  @IsOptional()
  @Transform(normalizeJsonValue)
  @IsObject()
  shortDescription?: Record<string, unknown>;

  @ApiProperty({ description: 'Lexical JSON content' })
  @Transform(normalizeJsonValue)
  @IsObject()
  @IsNotEmpty()
  content: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }
    return value === 'true' || value === true;
  })
  @IsBoolean()
  published?: boolean;

  @ApiPropertyOptional({ enum: NewsType })
  @IsOptional()
  @IsEnum(NewsType)
  type?: NewsType;

  @ApiPropertyOptional({ description: 'Display/filter date (ISO)' })
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiPropertyOptional({
    description: 'JSON array of attachment ids to remove (update only)',
  })
  @IsOptional()
  removedAttachmentIds?: unknown;

  @ApiPropertyOptional({
    description: 'Set true to remove cover image (update only)',
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }
    return value === 'true' || value === true;
  })
  @IsBoolean()
  removeImage?: boolean;
}
