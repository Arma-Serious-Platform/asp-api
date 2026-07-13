import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Length, Matches, ValidateIf } from 'class-validator';

export class VerifyTwoFactorDto {
  @ApiProperty()
  @IsString()
  twoFactorToken: string;

  @ApiPropertyOptional({ example: '123456' })
  @ValidateIf((dto: VerifyTwoFactorDto) => !dto.recoveryCode)
  @IsString()
  @Length(6, 6)
  @Matches(/^\d{6}$/)
  code?: string;

  @ApiPropertyOptional({ example: 'A1B2-C3D4' })
  @ValidateIf((dto: VerifyTwoFactorDto) => !dto.code)
  @IsOptional()
  @IsString()
  recoveryCode?: string;

  @ApiPropertyOptional({ description: 'Optional client-provided device label' })
  @IsOptional()
  @IsString()
  device?: string;
}
