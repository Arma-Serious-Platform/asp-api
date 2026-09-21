import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength, MaxLength } from 'class-validator';

export class SendBotNotificationDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  message: string;
}
