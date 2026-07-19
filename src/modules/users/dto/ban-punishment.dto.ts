import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class BanPunishmentDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  reason: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') {
      return false;
    }

    if (typeof value === 'boolean') {
      return value;
    }

    if (typeof value === 'string') {
      return value.toLowerCase() === 'true' || value === '1';
    }

    return Boolean(value);
  })
  @IsBoolean()
  mute?: boolean = false;
}
