import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Length, Matches, ValidateIf } from 'class-validator';

export class DisableTwoFactorDto {
  @ApiProperty()
  @IsString()
  password: string;

  @ApiPropertyOptional({ example: '123456' })
  @ValidateIf((dto: DisableTwoFactorDto) => !dto.recoveryCode)
  @IsString()
  @Length(6, 6)
  @Matches(/^\d{6}$/)
  code?: string;

  @ApiPropertyOptional({ example: 'A1B2-C3D4' })
  @ValidateIf((dto: DisableTwoFactorDto) => !dto.code)
  @IsOptional()
  @IsString()
  recoveryCode?: string;
}
