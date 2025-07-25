import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class ConfirmSignUpDto {
  @ApiProperty()
  @IsString()
  token: string;
}
