import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDefined,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { TribunalPunishmentDto } from './create-tribunal-complaint.dto';

export enum TribunalResolveOutcome {
  PUNISHED = 'PUNISHED',
  REJECTED = 'REJECTED',
}

export class ResolveTribunalComplaintDto {
  @ApiProperty({ enum: TribunalResolveOutcome })
  @IsEnum(TribunalResolveOutcome)
  outcome: TribunalResolveOutcome;

  @ApiPropertyOptional({ type: TribunalPunishmentDto })
  @ValidateIf(
    (dto: ResolveTribunalComplaintDto) =>
      dto.outcome === TribunalResolveOutcome.PUNISHED,
  )
  @IsDefined()
  @ValidateNested()
  @Type(() => TribunalPunishmentDto)
  punishment?: TribunalPunishmentDto;

  @ApiPropertyOptional()
  @ValidateIf(
    (dto: ResolveTribunalComplaintDto) =>
      dto.outcome === TribunalResolveOutcome.PUNISHED,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  @Matches(/^\d+(?:\.\d+)*$/)
  ruleNumber?: string;

  @ApiPropertyOptional()
  @ValidateIf(
    (dto: ResolveTribunalComplaintDto) =>
      dto.outcome === TribunalResolveOutcome.PUNISHED,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  ruleText?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  comment?: string;
}
