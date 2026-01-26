import { Optional } from '@nestjs/common';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsNumber,
  IsString,
  IsUUID,
} from 'class-validator';

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
  @Optional()
  @IsString()
  description?: string;

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
    if (value === '' || value === null || value === undefined) {
      return undefined;
    }
    return Number(value);
  })
  @IsNumber()
  activeCount?: number;
}
