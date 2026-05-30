import { Optional } from '@nestjs/common';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Prisma } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { normalizeJsonValue } from 'src/utils/normalize-json-value';

export class UpdateSquadDto {
  @ApiPropertyOptional()
  @Optional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @Optional()
  @IsString()
  tag?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(normalizeJsonValue)
  description?: Prisma.InputJsonValue;

  @ApiPropertyOptional()
  @Optional()
  @IsString()
  leaderId?: string;

  @ApiPropertyOptional()
  @Optional()
  @IsUUID()
  sideId?: string;

  @ApiPropertyOptional()
  @Optional()
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }
    if (value === true || value === 'true') {
      return true;
    }
    if (value === false || value === 'false') {
      return false;
    }
    return value;
  })
  @IsBoolean()
  recruiting?: boolean;

  @ApiPropertyOptional()
  @Optional()
  @Transform(({ value }) => {
    if (value === '' || value === null || value === undefined) {
      return undefined;
    }
    return Number(value);
  })
  @IsInt()
  @Min(0)
  activeCount?: number;

  @ApiPropertyOptional()
  @Optional()
  @IsString()
  telegramUrl?: string;

  @ApiPropertyOptional()
  @Optional()
  @IsString()
  discordUrl?: string;

  @ApiPropertyOptional()
  @Optional()
  @IsString()
  youtubeUrl?: string;

  @ApiPropertyOptional()
  @Optional()
  @IsString()
  twitchUrl?: string;

  @ApiPropertyOptional()
  @Optional()
  @IsString()
  tiktokUrl?: string;
}
