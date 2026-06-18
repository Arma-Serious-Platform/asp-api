import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { LoginUserDto } from 'src/modules/users/dto/login-user.dto';

export class SessionLoginDto extends LoginUserDto {
  @ApiPropertyOptional({ description: 'Optional client-provided device label' })
  @IsOptional()
  @IsString()
  device?: string;
}
