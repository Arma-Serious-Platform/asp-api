import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

export enum TribunalPunishmentRequestType {
  WARNING = 'WARNING',
  TEMP_BAN = 'TEMP_BAN',
  PERMANENT_BAN = 'PERMANENT_BAN',
}

export class TribunalPunishmentDto {
  @ApiProperty({ enum: TribunalPunishmentRequestType })
  @IsEnum(TribunalPunishmentRequestType)
  type: TribunalPunishmentRequestType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string;

  @ApiPropertyOptional()
  @ValidateIf((dto: TribunalPunishmentDto) => dto.type === TribunalPunishmentRequestType.TEMP_BAN)
  @IsDateString()
  bannedUntil?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  mute?: boolean;

  @ApiPropertyOptional({ description: 'Скільки попереджень дає це порушення' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10)
  warningCount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  comment?: string;
}

export class CreateTribunalComplaintDto {
  @ApiProperty()
  @IsUUID()
  targetUserId: string;

  @ApiPropertyOptional({ description: 'Задає лише адміністрація' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  @Matches(/^\d+(?:\.\d+)*$/)
  ruleNumber?: string;

  @ApiPropertyOptional({ description: 'Задає лише адміністрація' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  ruleText?: string;

  @ApiProperty()
  @IsDateString()
  violatedAt: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  gameId?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  @MaxLength(4000)
  description: string;
}
