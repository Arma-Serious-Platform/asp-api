import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class ChangeNicknameDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  nickname: string;
}
