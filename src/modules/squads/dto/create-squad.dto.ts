import { Optional } from '@nestjs/common';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsDefined,
  IsInt,
  IsNotEmpty,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

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
  @Optional()
  @IsString()
  description: string;

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
