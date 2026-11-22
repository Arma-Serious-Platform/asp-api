import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateTribunalMessageDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(20000)
  body: string;
}
