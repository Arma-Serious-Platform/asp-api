import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateUserWarningDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  reason: string;
}
