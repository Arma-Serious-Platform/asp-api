import { Optional } from '@nestjs/common';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { Prisma } from '@prisma/client';
import {
  IsDefined,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { normalizeJsonValue } from 'src/utils/normalize-json-value';

export class CreateSquadDto {
  @ApiProperty()
  @IsDefined()
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsDefined()
  @IsNotEmpty()
  @IsString()
  tag: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(normalizeJsonValue)
  description?: Prisma.InputJsonValue;

  @ApiProperty()
  @IsDefined()
  @IsNotEmpty()
  @IsString()
  leaderId: string;

  @ApiProperty()
  @IsDefined()
  @IsNotEmpty()
  @IsUUID()
  sideId: string;

  @ApiPropertyOptional()
  @Transform((value) => Number(value) || undefined)
  @Optional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  activeCount?: number;
}
