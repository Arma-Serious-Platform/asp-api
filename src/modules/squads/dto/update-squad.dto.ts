import { Optional } from '@nestjs/common';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
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
  @Type(() => File)
  logo?: File;

  @ApiPropertyOptional()
  @Optional()
  @IsNumber()
  activeCount?: number;
}
