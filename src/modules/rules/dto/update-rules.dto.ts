import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength } from 'class-validator';

export class UpdateRulesDto {
  @ApiProperty()
  @IsString()
  @MaxLength(100000)
  content: string;
}
