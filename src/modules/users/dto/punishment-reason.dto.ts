import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class PunishmentReasonDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  reason: string;
}

export class OptionalPunishmentReasonDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  reason?: string;
}
