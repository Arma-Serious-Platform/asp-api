import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches, MaxLength } from 'class-validator';

export class SetTribunalRuleDto {
  @ApiProperty({ example: '1.3' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  @Matches(/^\d+(?:\.\d+)*$/)
  ruleNumber: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  ruleText: string;
}
